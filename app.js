const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const upload = multer({ dest: 'uploads/' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'models/gemini-2.0-flash',
    generationConfig: {
        temperature: 0.5
    }
})
const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.post('/generate-text', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        res.status(400).json({ error: 'Prompt is required' })
    }
    try {
        const result = await model.generateContent(message);
        const { response } = result;
        res.json({ output: response.text() });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

const imageToGenerativePart = (filePath) => ({
    inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
        mimeType: 'image/png',
    },
})

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || "Describe the image";
    const filePath = req.file.path;
    const image = imageToGenerativePart(filePath);

    try {
        const result = await model.generateContent([prompt, image]);
        const { response } = result;
        res.json({ output: response.text() });
    } catch (error) {
        return res.status(500).json({ error: error.message });

    } finally {
        fs.unlinkSync(filePath);
    }
})

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const prompt = req.body.prompt || "Analyze this document";
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const documentPart = {
        inlineData: { data: base64Data, mimeType }
    }
    try {
        const result = await model.generateContent([prompt, documentPart]);
        const response = result.response.text();
        res.json({ output: response })
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(filePath);
    }
})

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const prompt = req.body.prompt || "Transcribe or analyze the following audio";
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Audio = buffer.toString('base64');
    const mimeType = req.file.mimetype;
    try {
        const audioPart = {
            inlineData: { data: base64Audio, mimeType }
        }
        const result = await model.generateContent([prompt, audioPart]);
        const response = result.response.text();
        res.json({ output: response })
    } catch (error) {
        return res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(filePath);
    }
})

app.listen(PORT);