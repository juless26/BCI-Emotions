const https = require('https');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { prompt, realism } = JSON.parse(event.body);
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API token not configured' }) };
    }

    let enhancedPrompt = prompt;
    if (realism <= 2) {
      enhancedPrompt += ', impressionistic, painterly, artistic style';
    } else if (realism >= 5) {
      enhancedPrompt += ', photorealistic, highly detailed, professional photography';
    }

    const prediction = await createPrediction(apiToken, enhancedPrompt);
    const imageUrl = await waitForPrediction(apiToken, prediction.id);
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Server error' })
    };
  }
};

function createPrediction(apiToken, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'black-forest-labs/flux-2-pro',
      input: {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'webp'
      }
    });

    const options = {
      hostname: 'api.replicate.com',
      path: '/v1/predictions',
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function waitForPrediction(apiToken, predictionId, maxWait = 300000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkPrediction = () => {
      if (Date.now() - startTime > maxWait) {
        reject(new Error('Prediction timeout'));
        return;
      }

      const options = {
        hostname: 'api.replicate.com',
        path: `/v1/predictions/${predictionId}`,
        method: 'GET',
        headers: { 'Authorization': `Token ${apiToken}` }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const prediction = JSON.parse(body);
            if (prediction.status === 'succeeded') {
              resolve(prediction.output[0]);
            } else if (prediction.status === 'failed') {
              reject(new Error(`Prediction failed: ${prediction.error}`));
            } else {
              setTimeout(checkPrediction, 1000);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    };

    checkPrediction();
  });
}

function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      let data = '';
      res.setEncoding('binary');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const base64 = Buffer.from(data, 'binary').toString('base64');
        resolve(`data:image/webp;base64,${base64}`);
      });
    }).on('error', reject);
  });
}
