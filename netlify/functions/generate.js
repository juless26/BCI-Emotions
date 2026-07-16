exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { prompt, realism } = JSON.parse(event.body);
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stability API key not configured' }) };
    }

    let enhancedPrompt = prompt;
    if (realism <= 2) {
      enhancedPrompt += ', impressionistic, painterly, artistic style';
    } else if (realism >= 5) {
      enhancedPrompt += ', photorealistic, highly detailed, professional photography';
    }

    // Call Stability AI API
    const response = await fetch('https://api.stability.ai/v1/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        cfg_scale: 7,
        height: 512,
        width: 512,
        samples: 1,
        steps: 30
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Stability API error:', response.status, responseData);
      throw new Error(`Stability API error: ${response.status} - ${JSON.stringify(responseData).substring(0, 200)}`);
    }

    if (!responseData.artifacts || responseData.artifacts.length === 0) {
      throw new Error('No image generated');
    }

    const imageBase64 = `data:image/png;base64,${responseData.artifacts[0].base64}`;

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
