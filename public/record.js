const url = `/record`;
fetch(url)
    .then((res) => {
        return res.json();
    })
    .then((jsonData) => {
        return constructData(jsonData);
    })
    .then((data) => {
        showData(data);
    })
    .catch((err) => {
        console.error("Error from fetching record:", err);
    });

function constructData(jsonData) {
    data = [0, 0, 0];
    const id = jsonData.id;
    const records = jsonData.records;
    for (record of records) {
        let score = (record.left_uid == id) ? record.score : record.score * -1;
        score = parseInt(score) + 1; data[score] += 1;
    }
    return {records: records, score: data};
}

function showData(data) {
    const chartData = {
        labels: [
            '승',
            '무',
            '패'
        ],
        datasets: [{
            label: '횟수',
            data: data.score,
            backgroundColor: [
                'rgb(255, 63, 63)',
                'rgb(63, 255, 63)',
                'rgb(63, 63, 255)'
            ],
            hoverOffset: 4
        }]
    }

    const options = {
        responsive: false
    }

    const config = {
        type: 'doughnut',
        data: chartData,
        options: options
    }

    const chart_canvas = document.getElementById('record-chart');
    const record_chart = new Chart(chart_canvas, config);

    const record_table = document.getElementById('record-table');
    const record_tbody = record_table.getElementsByTagName('tbody')[0];

    for (record of data.records) {
        const newRow = record_tbody.insertRow();
        const timeCell = newRow.insertCell(0);
        const leftHandCell = newRow.insertCell(1);
        const rightHandCell = newRow.insertCell(2);
        const scoreCell = newRow.insertCell(3);
        const date = new Date(record.timestamp)
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();

        timeCell.innerHTML = `${year}/${month}/${day} ${hour}:${minute}:${second}`;
        leftHandCell.innerHTML = hands[record.left_hand];
        rightHandCell.innerHTML = hands[record.right_hand];
        let score = undefined;
        if (record.score == 1) {
            score = '승';
        } else if (record.score == 0) {
            score = '무';
        } else {
            score = '패';
        }
        scoreCell.innerHTML = score;
    }
}