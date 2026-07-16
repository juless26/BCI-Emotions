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

async function createPrediction(apiToken, prompt) {
  try {
    // First, get the latest version of flux-2-pro
    const modelResponse = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro', {
      headers: { 'Authorization': `Token ${apiToken}` }
    });

    const modelData = await modelResponse.json();
    const versionId = modelData.latest_version?.id;

    if (!versionId) {
      throw new Error('Could not fetch latest flux-2-pro version');
    }

    console.log('Using version:', versionId);

    const payload = {
      version: versionId,
      input: {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'webp'
      }
    };

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text.substring(0, 500));

    if (!response.ok) {
      throw new Error(`API error: ${response.status}. Response: ${text.substring(0, 200)}`);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

async function waitForPrediction(apiToken, predictionId, maxWait = 300000) {
  const startTime = Date.now();

  const checkPrediction = async () => {
    if (Date.now() - startTime > maxWait) {
      throw new Error('Prediction timeout');
    }

    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${apiToken}` }
      });

      const text = await response.text();
      const prediction = JSON.parse(text);

      if (prediction.status === 'succeeded') {
        return prediction.output[0];
      } else if (prediction.status === 'failed') {
        throw new Error(`Prediction failed: ${prediction.error}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkPrediction();
      }
    } catch (error) {
      throw error;
    }
  };

  return checkPrediction();
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/webp;base64,${base64}`;
  } catch (error) {
    throw new Error(`Failed to fetch image: ${error.message}`);
  }
}
