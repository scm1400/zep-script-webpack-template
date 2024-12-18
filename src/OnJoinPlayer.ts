
export class OnJoinPlayer {
    constructor() {
        ScriptApp.onJoinPlayer.Add((player) => {
            player.showAlert("hello " + player.name);
        })
    }
}

