const https = require('https');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, realism } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Get API token from environment variable
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error('REPLICATE_API_TOKEN not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API token not configured' })
      };
    }

    // Determine model based on realism setting
    // realism 1-2: more artistic/impressionistic
    // realism 3-4: balanced
    // realism 5: photorealistic
    const models = {
      artistic: 'stable-diffusion:db21e45d3f7023abc9571faf60dd5b3b910bcee75cbfd08d04f55a62cf1b9546',
      balanced: 'stable-diffusion:db21e45d3f7023abc9571faf60dd5b3b910bcee75cbfd08d04f55a62cf1b9546',
      realistic: 'stable-diffusion:db21e45d3f7023abc9571faf60dd5b3b910bcee75cbfd08d04f55a62cf1b9546'
    };

    let modelType = 'balanced';
    if (realism <= 2) modelType = 'artistic';
    else if (realism >= 5) modelType = 'realistic';

    // Add style prompts based on realism
    let enhancedPrompt = prompt;
    if (realism <= 2) {
      enhancedPrompt += ', impressionistic, painterly, artistic style';
    } else if (realism >= 5) {
      enhancedPrompt += ', photorealistic, highly detailed, professional photography';
    }

    // Create prediction via Replicate API
    const predictionRequest = {
    version: '27b93a2413e7f36cd83da926f3798502766a7580efa141307cf06ba8672fe58d',
      input: {
        prompt: enhancedPrompt,
        num_outputs: 1,
        height: 768,
        width: 768,
        num_inference_steps: 50,
        guidance_scale: 7.5
      }
    };

    console.log('Calling Replicate with prompt:', enhancedPrompt);

    // Poll for prediction completion
    const imageUrl = await callReplicateAPI(apiToken, predictionRequest);

    if (!imageUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate image' })
      };
    }

    // Fetch the image and convert to base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageBase64
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message || 'Server error'
      })
    };
  }
};

async function callReplicateAPI(apiToken, predictionData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(predictionData);

    const options = {
      hostname: 'api.replicate.com',
      path: '/v1/predictions',
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode !== 201) {
            reject(new Error(`Replicate API error: ${response.detail || response.error || 'Unknown error'}`));
            return;
          }

          const predictionId = response.id;
          console.log('Prediction created:', predictionId);

          // Poll for completion
          const imageUrl = await pollForCompletion(apiToken, predictionId);
          resolve(imageUrl);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function pollForCompletion(apiToken, predictionId, maxAttempts = 120) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const pollInterval = setInterval(() => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        reject(new Error('Prediction timed out'));
        return;
      }

      https.get({
        hostname: 'api.replicate.com',
        path: `/v1/predictions/${predictionId}`,
        headers: {
          'Authorization': `Token ${apiToken}`
        }
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const prediction = JSON.parse(data);

            if (prediction.status === 'succeeded') {
              clearInterval(pollInterval);
              const imageUrl = prediction.output?.[0];
              if (!imageUrl) {
                reject(new Error('No output from prediction'));
              } else {
                resolve(imageUrl);
              }
            } else if (prediction.status === 'failed') {
              clearInterval(pollInterval);
              reject(new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`));
            }
            // If status is 'processing', continue polling
          } catch (e) {
            clearInterval(pollInterval);
            reject(e);
          }
        });
      }).on('error', (e) => {
        clearInterval(pollInterval);
        reject(e);
      });
    }, 1000); // Poll every second
  });
}

async function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      let data = '';
      res.setEncoding('binary');

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const base64 = Buffer.from(data, 'binary').toString('base64');
        resolve(`data:image/png;base64,${base64}`);
      });
    }).on('error', reject);
  });
}
