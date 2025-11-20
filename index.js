import fetch from "node-fetch";
import FormData from "form-data";

async function testGameList() {
    const url = "https://wegobet.asia//api/v1/index.php";

    const form = new FormData();
    form.append("module", "/games/getGameList");
    form.append("accessId", "20050695");
    form.append("accessToken", "c574d3c7b814b2efa4e62d179764b1864766adc8700240454d7fde1c56c3a855");

    const res = await fetch(url, {
        method: "POST",
        body: form
    });

    const data = await res.json();
    console.log(data);
}

testGameList();
