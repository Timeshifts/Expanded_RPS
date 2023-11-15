const GAME_STAGE = {
    WAIT_ANOTHER: "wait_another",
    CHOICE_HAND: "choice_hand",
    WAIT_HAND: "wait_hand",
    SHOW_RESULT: "show_result"
}

Object.freeze(GAME_STAGE)

let select_hand = undefined;
let other_hand = undefined;

function draw_game(state) {
    if (state === GAME_STAGE.WAIT_ANOTHER) {
        $("#game_view").html(`<p>다른 플레이어를 기다리는 중...</p>`);
    } else if (state === GAME_STAGE.CHOICE_HAND) {
        $("#game_view").html(`<h2>원하는 손을 선택하세요!</h2>
        <div id="hands"></div>`);
        $("#hands").html(`
        <img src="image/scissors.png" alt="가위" height="128" width="128" />
        <img src="image/rock.png" alt="바위" height="128" width="128" />
        <img src="image/paper.png" alt="보" height="128" width="128" />
        <img src="image/lizard.png" alt="도마뱀" height="128" width="128" />
        <img src="image/spock.png" alt="스팍" height="128" width="128" />`);
    } else if (state === GAME_STAGE.WAIT_HAND) {
        $("#game_view").html(`<h2>상대방의 결정을 기다리는 중...</h2>
        <div id="hands"></div>`);
        $("#hands").html(`<div>선택한 손: </div>
        <img id="choose_hand" height="128" width="128"/>`)
    } else if (state === GAME_STAGE.SHOW_RESULT) {
        $("#game_view").html(`<h2 id=result>결과</h2>
        <img id="my_hand" height="128" width="128"/>
        <div id="mark"></div>
        <img id="other_hand" height="128" width="128"/>`)
    }
}

$(document).ready(() => {
    // 소켓 연결
    const socket = io('/');
    const gameSocket = io('/game');
    let game_stage = GAME_STAGE.WAIT_ANOTHER;
    draw_game(game_stage);

    // 게임 참여
    gameSocket.on('connect', () => {
        //gameSocket.emit
    });

    socket.emit('set_socket_id', { user_id: sessionStorage.getItem('user_id') });

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