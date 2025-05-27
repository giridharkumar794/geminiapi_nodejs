const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const config = {
    server: 'localhost\\SQLEXPRESS', 
    database: 'ProductDb',
    user: 'sa', 
    password: '12345678', 
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    }
};

const ai = new GoogleGenerativeAI("AIzaSyBIyPBLCqxqFG0W2pY9lRqu1OqRMDglw6k");
const model = ai.getGenerativeModel({model: "gemini-1.5-flash"});
app.post('/', async (req, res) => {
    try {
        const { prompt, fileContent, filetype } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }
        const fullprompt = [{ text: prompt }];

        if (fileContent && filetype) {
            const base64Data = fileContent.includes(',') 
                ? fileContent.split(',')[1] 
                : fileContent;
            
            fullprompt.push({
                inlineData: {
                    mimeType: filetype,
                    data: base64Data
                }
            });
        }
        const result = await model.generateContent(fullprompt);     
        const response = await result.response;
        const text = response.text();   
        res.json({ text });
    } 
    catch (err) 
    {
        res.status(500).json("Failed to process request");
    }
});

app.get('/', async (req, res) => {
	try{
		await sql.connect(config);
        	const result = await sql.query('SELECT * FROM ProductApis');
        	res.json(result.recordset);
	}
	catch(error)
	{
		res.status(500).json('ProductApis table is not executed');
	}
	finally{
		await sql.close();
	}
});
app.get('/GetCart', async (req, res) => {
	try{
		await sql.connect(config);
        	const result = await sql.query('SELECT * FROM Cart');
        	res.json(result.recordset);
	}
	catch(error)
	{
		res.status(500).json('ProductApis table is not executed');
	}
	finally{
		await sql.close();
	}
});
app.post('/AddToCart', async (req, res) => {
	try{
		 const { items } = req.body;
    		 await sql.connect(config);
		 for(var item of items)
		 {
			const { PId, PName, Price, Quantity } = item;
			const request = new sql.Request();
		 	request.input('PId', sql.Int, PId);
		 	request.input('PName', sql.NVarChar, PName);
        	 	request.input('Price', sql.Decimal(18, 2), Price);
        	 	request.input('Quantity', sql.Int, Quantity);
  	        	await request.query(`
	         		INSERT INTO Cart (PId, PName, Price, Quantity)
                        	VALUES (@PId, @PName, @Price, @Quantity)
   		        `);
		 }
		 res.json('All Products added successfully');
	}
	catch(error)
	{
		res.status(500).json('cart is not updated successfully');
	}
	finally{
		await sql.close();
	}
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
