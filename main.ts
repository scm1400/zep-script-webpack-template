import { ScriptPlayer } from "zep-script";
import { OnJoinPlayer } from "./src/OnJoinPlayer";

ScriptApp.onInit.Add(()=>{
    new OnJoinPlayer();
})