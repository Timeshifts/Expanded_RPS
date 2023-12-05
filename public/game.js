const GAME_STAGE = {
    WAIT_ANOTHER: "wait_another",
    CHOICE_HAND: "choice_hand",
    WAIT_HAND: "wait_hand",
    SHOW_RESULT: "show_result"
}

Object.freeze(GAME_STAGE)

let select_hand = undefined;
let other_hand = undefined;
let state = undefined;
let showing_rules = false;

function toggle_rules() {
    showing_rules = !showing_rules;
    if (showing_rules) {
        $("#rules").html(`
        <img src="image/rules.png" class="rules" alt="규칙" height="256" width="256" />
        <button class="rules" onclick="toggle_rules()">규칙</button>`);
    } else {
        $("#rules").html(`<button class="rules" onclick="toggle_rules()">규칙</button>`);
    }
}

function escape_game() {
    if (state !== undefined) return;
    $("#game_view").html(`<p>연결이 지연되고 있습니다...</p>
    <br><button type="button" onclick="document.location = '/'">돌아가기</button><br>`);
}

function draw_game(state) {
    if (state === GAME_STAGE.WAIT_ANOTHER) {
        $("#game_view").html(`<p>다른 플레이어를 기다리는 중...</p>`);
        setTimeout(escape_game, 10000);
    } else if (state === GAME_STAGE.CHOICE_HAND) {
        $("#game_view").html(`<h2>원하는 손을 선택하세요!</h2>
        <div id="hands"></div>`);
        $("#hands").html(`
        <button type="button" class="hands-button" id="button-scissors">
            <img src="image/scissors.png" alt="가위" height="128" width="128" /><br>가위
        </button>
        <button type="button" class="hands-button" id="button-rock">
            <img src="image/rock.png" alt="바위" height="128" width="128" /><br>바위
        </button>
        <button type="button" class="hands-button" id="button-paper">
            <img src="image/paper.png" alt="보" height="128" width="128" /><br>보
        </button>
        <button type="button" class="hands-button" id="button-lizard">
            <img src="image/lizard.png" alt="도마뱀" height="128" width="128" /><br>도마뱀
        </button>
        <button type="button" class="hands-button" id="button-spock">
            <img src="image/spock.png" alt="스팍" height="128" width="128" /><br>스팍
        </button>`);
    } else if (state === GAME_STAGE.WAIT_HAND) {
        $("#game_view").html(`<h2>상대방의 결정을 기다리는 중...</h2>
        <div id="hands"></div>`);
        $("#hands").html(`<div>선택한 손: </div>
        <img id="choose-hand" height="128" width="128"/>`)
    } else if (state === GAME_STAGE.SHOW_RESULT) {
        $("#game_view").html(`<h2 id=result>결과</h2>
        <div>
        <div id="result-detail">
        <img id="my-hand" alt="자신의 손" height="128" width="128"/> vs
        <img id="other-hand" alt="상대의 손" height="128" width="128"/>
        </div>
        <br>
        <button type="button" id="button-rematch">재대결</button>
        <button type="button" id="button-leave">나가기</button>
        </div>`)
    }
}

function choose_hand(socket, hand) {
    socket.emit('choose_hand', hand);
    $("#game_view").html(`<h4>선택한 손: ${hands[hand]}</h4><h4>다른 플레이어를 기다리는 중...</h4>`)
}

function rematch_request(socket) {
    socket.emit('rematch_request');
}

function leave(socket) { document.location = '/'; }

function change_state(socket, data) {
    state = data.state;
    draw_game(state);
    if (state === GAME_STAGE.CHOICE_HAND) {
        $('#button-scissors').click(() => choose_hand(socket, 'scissors'));
        $('#button-rock').click(() => choose_hand(socket, 'rock'));
        $('#button-paper').click(() => choose_hand(socket, 'paper'));
        $('#button-lizard').click(() => choose_hand(socket, 'lizard'));
        $('#button-spock').click(() => choose_hand(socket, 'spock'));
    } else if (state === GAME_STAGE.SHOW_RESULT) {
        $('#my-hand').attr('src', `image/${data.hands[0]}.png`);
        $('#other-hand').attr('src', `image/${data.hands[1]}.png`);
        if (data.winner === 0) {
            result_text = '무승부';
            result_color = 'black';
        } else if (data.winner === -1) {
            result_text = '승리!';
            result_color = 'green'
        } else if (data.winner === 1) {
            result_text = '패배';
            result_color = 'red'
        }
        $('#result').html(result_text);
        $('#result').css("color", result_color)
        $('#button-rematch').click(() => rematch_request(socket));
        $('#button-leave').click(() => leave(socket));
    }
}

$(document).ready(() => {
    // 소켓 연결
    const socket = io('/');
    const gameSocket = io('/game');
    let game_stage = GAME_STAGE.WAIT_ANOTHER;
    draw_game(game_stage);

    gameSocket.on('change_state', (data) => {
        change_state(gameSocket, data);
    });

    gameSocket.on('rematch_request', (data) => {
        let result_html = $('#result').html();
        if (!result_html.includes('재 대결'))
        $('#result').html(`${result_html} - 상대방이 재 대결을 요청했습니다.`);
    });

    gameSocket.on('re_match', () => {
        change_state(gameSocket, {state: GAME_STAGE.CHOICE_HAND});
    });

    gameSocket.on('other_disconnect', (data) => {
        alert('상대방의 연결이 끊어졌습니다.');
        document.location = '../';
    });

    socket.on('alert', (data) => {
        alert(data.message);
    });

    socket.on('disconnect', (data) => {
        alert('연결이 끊어졌습니다.');
        document.location = '../';
    });

    socket.on('set-storage', (data) => {
        sessionStorage.setItem(data.key, data.value);
    });
});
