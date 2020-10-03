// categories is the main data structure for the app; it looks like this:

//  [
//    { title: "Math",
//      clues: [
//        {question: "2+2", answer: 4, showing: null},
//        {question: "1+1", answer: 2, showing: null}
//        ...
//      ],
//    },
//    { title: "Literature",
//      clues: [
//        {question: "Hamlet Author", answer: "Shakespeare", showing: null},
//        {question: "Bell Jar Author", answer: "Plath", showing: null},
//        ...
//      ],
//    },
//    ...
//  ]

let categories = [];
const NUM_CATEGORIES = 6;
const NUM_QUESTIONS_PER_CAT = 5;
const DEVREVIEW = true;

/** Get NUM_CATEGORIES random category from API.
 *
 * Returns array of category ids
 */
//Done
async function getCategoryIds() {
    let catIds = [];
    for (let i = 0; i < NUM_CATEGORIES; i++) {
        let response = await axios.get('http://jservice.io/api/random');
        let catId = response.data[0].category_id;
        let catresponse = await axios.get(`http://jservice.io/api/category?id=${catId}`);
        let cluesList = catresponse.data.clues;
        let cleanClues = removebrokencluesets(cluesList);
        //if (DEVREVIEW && cluesList.length !== cleanClues.length) { debugger; }
        if (cleanClues.length > NUM_QUESTIONS_PER_CAT) {
            catIds.push(catId);
        } else {
            i--;
        }

    }
    return catIds;
}

//Divide clues list into an array of clues by airdate
//filter out airdate arrays that have rejectable problems

function removebrokencluesets(cluesList) {
    let workingClues = []
    cluesList = removeDuplicateClues(cluesList);
    let airdates = cluesList.reduce((dates, clue) => {
        if (dates === undefined) { debugger; }
        if (!dates.includes(clue.airdate)) {
            dates.push(clue.airdate);
        }
        return dates;
    }, []);
    for (date of airdates) {
        let dateclues = cluesList.filter((clue) => clue.airdate === date)
        if (testViableQs(dateclues)) { workingClues.push(...dateclues); }
    }
    return workingClues;
}



function testViableQs(cluesList) {
    //Any of the questions are blank
    let blankQs = cluesList.some((clue) => clue.question === "");
    //Any of the answers are blank
    let blankAs = cluesList.some((clue) => clue.answer === "");
    //The questions are [instrumental]... indicating a missing sound file
    let instrumental = cluesList.some((clue) => clue.question === "[instrumental]");
    return (!(blankQs || blankAs || instrumental || cluesList.length < NUM_QUESTIONS_PER_CAT));
}

/** Return object with data about a category:
 *
 *  Returns { title: "Math", clues: clue-array }
 *
 * Where clue-array is:
 *   [
 *      {question: "Hamlet Author", answer: "Shakespeare", showing: null},
 *      {question: "Bell Jar Author", answer: "Plath", showing: null},
 *      ...
 *   ]
 */
//Done
async function getCategory(catId) {
    let response = await axios.get(`http://jservice.io/api/category?id=${catId}`)
    let cluesArr = [];
    let allClues = response.data.clues
    let numAllClues = allClues.length
    let filteredClues = [];

    //removes duplicate clues
    allClues = removebrokencluesets(allClues);

    //picks a random airdate and then returns a filtered list with only questions asked on that airdate
    while (filteredClues.length < NUM_QUESTIONS_PER_CAT) {
        let airdate = pick_randomAirdate(allClues);
        filteredClues = allClues.filter((clue) => clue.airdate === airdate);
    }
    //pushes the filtered clues into an array
    for (clue of filteredClues) {
        cluesArr.push({ question: clue.question, answer: clue.answer, showing: null, value: clue.value, })
    }
    cluesArr = imputeMissingPointValues(cluesArr);
    cluesArr.sort((a, b) => a.value - b.value);
    let catObj = { title: response.data.title, clues: cluesArr }
    console.log(catObj)
    return catObj;
}
//Takes a list of clues and returns the list with duplicates removed
function removeDuplicateClues(cluesList) {
    let questionArr = [];
    let newClueList = [];
    for (clue of cluesList) {
        if (!(questionArr.includes(clue.question))) {
            newClueList.push(clue);
            questionArr.push(clue.question);
        }
    }
    return newClueList;
}
//Takes a list of clues and returns the list with missing point values replaced
function imputeMissingPointValues(clueList) {
    for (let i = 0; i < clueList.length; i++) {
        if (clueList[i].value === null) {
            switch (i) {
                case 0:
                    if (clueList[i + 1] === undefined) { debugger; }
                    clueList[i].value = clueList[i + 1].value / 2
                    break;
                case clueList.length - 1:
                    if (clueList[i - 1] === undefined || clueList[i - 2] === undefined) { debugger; }
                    clueList[i].value = clueList[i - 1].value * 2 - clueList[i - 2].value;
                    break;
                default:
                    if (clueList[i - 1] === undefined || clueList[i + 1] === undefined) { debugger; }
                    clueList[i].value = (clueList[i - 1].value + clueList[i + 1].value) / 2;
                    break;
            }
        }
    }
    return clueList;
}
//Takes a list of clues, and returns a random airdate between them
function pick_randomAirdate(clueList) {
    let airdates = [];
    for (clue of clueList) {
        if (!(clue.airdate in airdates)) {
            airdates.push(clue.airdate);
        }
    }
    let randomIndex = Math.floor(Math.random() * airdates.length);
    return airdates[randomIndex];
}


/** Fill the HTML table#jeopardy with the categories & cells for questions.
 *
 * - The <thead> should be filled w/a <tr>, and a <td> for each category
 * - The <tbody> should be filled w/NUM_QUESTIONS_PER_CAT <tr>s,
 *   each with a question for each category in a <td>
 *   (initally, just show a "?" where the question/answer would go.)
 */

function fillTable() {
    let numCategories = categories.length
    let table = $("<table>");
    let thead = $("<thead>");
    table.append(thead);
    let toprow = $("<tr>");
    thead.append(toprow);
    for (let i = 0; i < numCategories; i++) {
        let topCell = $("<td>").text(categories[i].title).addClass("category-header");
        toprow.append(topCell);
    }
    let body = $("<tbody>");
    table.append(body);
    for (let i = 0; i < NUM_QUESTIONS_PER_CAT; i++) {
        let row = $("<tr>");
        for (let j = 0; j < numCategories; j++) {
            if (categories[j] === undefined) { debugger; }
            if (categories[j].clues[i] === undefined) { debugger; }
            let value = categories[j].clues[i].value;
            let id = `${j}-${i}`;
            let cell = $("<td>").text(`${value}`).addClass("hidden-question question").attr('id', id);
            row.append(cell);
        }
        body.append(row);
    }
    $("#gameboard").append(table);

}

/** Handle clicking on a clue: show the question or answer.
 *
 * Uses .showing property on clue to determine what to show:
 * - if currently null, show question & set .showing to "question"
 * - if currently "question", show answer & set .showing to "answer"
 * - if currently "answer", ignore click
 * */

function handleClick(evt) {
    if (evt.target.classList.contains("question")) {
        let categorynum = +evt.target.id.split("-")[0];
        let cluenum = +evt.target.id.split("-")[1];
        console.log(`Category:${categorynum} Question:${cluenum}`);
        let clue = categories[categorynum].clues[cluenum];
        let cell = $(`#${categorynum}-${cluenum}`);
        //debugger;
        switch (clue.showing) {
            case null:
                clue.showing = "question"
                cell.html(clue.question).addClass('questioned');
                break;
            case "question":
                clue.showing = "answer"
                cell.html(clue.answer).addClass('revealed').removeClass('questioned');
                break;
            default:
                return;
        }
    }
}

/** Wipe the current Jeopardy board, show the loading spinner,
 * and update the button used to fetch data.
 */

function showLoadingView() {
    $("#loading-spinner").show();
    $("#start").addClass("clicked").removeClass("unclicked");
}

/** Remove the loading spinner and update the button used to fetch data. */
//Done
function hideLoadingView() {
    $("#loading-spinner").hide();
    $("#start").addClass("unclicked").removeClass("clicked");
}

/** Start game:
 *
 * - get random category Ids
 * - get data for each category
 * - create HTML table
 * */

async function setupAndStart() {
    let randomIds = await getCategoryIds();
    categories = [];
    for (id of randomIds) {
        let category = await getCategory(id);
        categories.push(category);
    }
    fillTable();
    return categories;
}

/** On click of start / restart button, set up game. */
async function clickStart() {
    $('#gameboard').hide().html("");

    $('#start').text("Loading...")
    showLoadingView();
    await setupAndStart();
    hideLoadingView();
    $('#start').text("Restart!")
    $('#gameboard').show();

}
// TODO

/** On page load, add event handler for clicking clues */
$(function() {
        $('#start').on("click", clickStart)
        hideLoadingView();
        $('#gameboard').on("click", handleClick)
    })
    // TODO