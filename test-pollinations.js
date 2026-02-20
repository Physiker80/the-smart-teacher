
import https from 'https';

const test = (name, length, model = "") => {
    let text = "A vibrant 3D Pixar style scene of a smart teacher explaining a lesson to happy students in a bright classroom with colorful educational posters. ";
    while (text.length < length) text += "The details are amazing and the lighting is cinematic. ";

    text = text.substring(0, length);

    const encoded = encodeURIComponent(text);
    const params = model ? `nologo=true&model=${model}` : `nologo=true`;
    const url = `https://image.pollinations.ai/prompt/${encoded}?${params}`;

    console.log(`[${name}] Length: ${text.length}`);

    https.get(url, (res) => {
        console.log(`[${name}] Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(`[${name}] Error: ${e.message}`);
    });
};

test("English 200 Default", 200);
test("English 500 Default", 500);
test("English 800 Default", 800);
test("English 200 Flux", 200, "flux");
test("English 800 Flux", 800, "flux");
