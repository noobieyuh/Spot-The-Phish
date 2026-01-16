import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import * as tf from '@tensorflow/tfjs';

tf.setBackend('cpu').catch(err => console.error('Backend init failed:', err));

async function buildAndLoadModel(): Promise<tf.LayersModel> {
  const modelResponse = await fetch('/tfjs_model/model.json');
  const modelJson = await modelResponse.json();
  
  console.log('Model JSON loaded, weightsManifest:', modelJson.weightsManifest);
  
  // New model expects 5000 input features
  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        inputShape: [5000],
        units: 64,
        activation: 'relu',
        name: 'dense'
      }),
      tf.layers.dropout({ rate: 0.3, name: 'dropout' }),
      tf.layers.dense({
        units: 32,
        activation: 'relu',
        name: 'dense_1'
      }),
      tf.layers.dropout({ rate: 0.2, name: 'dropout_1' }),
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
        name: 'dense_2'
      })
    ]
  });

  console.log('Model created with layers:', model.layers.length);

  const weightsManifest = modelJson.weightsManifest;
  
  const weightsDataMap: { [key: string]: ArrayBuffer } = {};
  for (const group of weightsManifest) {
    for (const path of group.paths) {
      console.log('Fetching weights from:', `/tfjs_model/${path}`);
      const response = await fetch(`/tfjs_model/${path}`);
      weightsDataMap[path] = await response.arrayBuffer();
      console.log(`Loaded ${path}, size: ${weightsDataMap[path].byteLength} bytes`);
    }
  }

  const weightTensors: tf.NamedTensorMap = {};

  for (const group of weightsManifest) {
    const buffer = new Float32Array(weightsDataMap[group.paths[0]]);
    console.log(`Parsing group with ${group.weights.length} weights, buffer size: ${buffer.length}`);
    
    let bufferOffset = 0;

    for (const weight of group.weights) {
      const shape = weight.shape;
      const size = shape.reduce((a: number, b: number) => a * b, 1);
      const data = buffer.slice(bufferOffset, bufferOffset + size);
      
      let hasNaN = false;
      for (let i = 0; i < data.length; i++) {
        if (isNaN(data[i])) hasNaN = true;
      }
      
      console.log(`Weight ${weight.name}: shape=${JSON.stringify(shape)}, size=${size}, offset=${bufferOffset}, hasNaN=${hasNaN}`);
      
      weightTensors[weight.name] = tf.tensor(data, shape, 'float32');
      bufferOffset += size;
    }
  }

  console.log('Loaded weight tensors:', Object.keys(weightTensors));

  // Updated weight names for new model
  const w1 = weightTensors['sequential/dense/kernel'];
  const b1 = weightTensors['sequential/dense/bias'];
  const w2 = weightTensors['sequential/dense_1/kernel'];
  const b2 = weightTensors['sequential/dense_1/bias'];
  const w3 = weightTensors['sequential/dense_2/kernel'];
  const b3 = weightTensors['sequential/dense_2/bias'];

  if (w1 && b1 && w2 && b2 && w3 && b3) {
    model.layers[0].setWeights([w1, b1]);
    model.layers[2].setWeights([w2, b2]);
    model.layers[4].setWeights([w3, b3]);
    console.log('Weights assigned successfully');
  } else {
    console.warn('Some weights missing, using random initialization');
  }

  return model;
}

// Create 5000 features from text (bag-of-words style or character embeddings)
function preprocess(text: string): tf.Tensor {
  const cleaned = text.trim().toLowerCase();
  
  // Create 5000 features - use character codes as indices
  const features = new Array(5000).fill(0);
  
  // Simple approach: use character frequency and patterns
  for (let i = 0; i < cleaned.length && i < 5000; i++) {
    const charCode = cleaned.charCodeAt(i);
    // Normalize to 0-1 range
    features[i] = (charCode % 256) / 256;
  }
  
  // Add some statistical features at the end
  const wordCount = Math.min(cleaned.split(/\s+/).length / 100, 1);
  const hasLinks = cleaned.includes('http') ? 1 : 0;
  const hasPassword = cleaned.includes('password') ? 1 : 0;
  const hasVerify = cleaned.includes('verify') ? 1 : 0;
  const hasAccount = cleaned.includes('account') ? 1 : 0;
  
  // Pad with these features
  features[4995] = wordCount;
  features[4996] = hasLinks;
  features[4997] = hasPassword;
  features[4998] = hasVerify;
  features[4999] = hasAccount;
  
  console.log('Preprocessed text to 5000 features, sample:', features.slice(0, 10));
  return tf.tensor2d([features], [1, 5000]);
}

// file reading
function readUserFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// -----------------------------
// React Component
// -----------------------------
export default function App() {
  const [model, setModel] = useState<tf.LayersModel | tf.GraphModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState('Results will be here!');
  const fileInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      console.log('Building and loading model...');
      const loaded = await buildAndLoadModel();
      console.log('Model ready:', loaded);
      if (mounted) setModel(loaded);
    } catch (err) {
      console.error('Model load error:', err);
      if (mounted) setResult(`Failed to load model: ${(err as Error).message}`);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, []);

  const handleRun = async () => {
    const input = fileInputRef.current;
    if (!input?.files?.length) {
      setResult('Please upload a .txt file first.');
      return;
    }
    if (!model) {
      setResult('Model is still loading.');
      return;
    }

    try {
      const text = await readUserFile(input.files[0]);
      const inputTensor = preprocess(text);

      // Debug: log input
      console.log('Input features:', await inputTensor.data());

      const raw = model.predict(inputTensor) as tf.Tensor | tf.Tensor[];

      let outputTensor: tf.Tensor;
      if (Array.isArray(raw)) {
        outputTensor = raw[0];
        raw.forEach((t, i) => {
          if (i > 0) t.dispose();
        });
      } else {
        outputTensor = raw;
      }

      const data = await outputTensor.data();
      const prob = data[0] ?? 0;

      // Debug: log output
      console.log('Raw prediction output:', prob);

      // Check if NaN and handle
      if (isNaN(prob)) {
        outputTensor.dispose();
        inputTensor.dispose();
        setResult('Model weights not loaded correctly. Check console.');
        return;
      }

      outputTensor.dispose();
      inputTensor.dispose();

      const percent = (prob * 100).toFixed(1);

      if (prob > 0.8) {
        setResult(`High phishing likelihood (${percent}%). You're chopped cheese lowkenuinely.`);
      } else if (prob > 0.5) {
        setResult(`Moderate phishing likelihood (${percent}%). You might get swissed cheesed so proceed with caution gangalang.`);
      } else {
        setResult(`Low phishing likelihood (${percent}%). You're cool as biscuits - keep swinging that thang.`);
      }

      input.value = "";
    } catch (err) {
      console.error(err);
      setResult('Error running prediction.');
    }
  };

  return (
    <>
      <h1>Spot The Phish</h1>
      <p className="info">
        Upload a <code>.txt</code> file to get started
      </p>

      <div className="card">
        <input ref={fileInputRef} type="file" accept=".txt" />
        <button onClick={handleRun} disabled={loading}>
          {loading ? 'Loading model...' : 'Run Analysis'}
        </button>
      </div>

      <p id="results">{result}</p>

      <p className="info">(This is a prototype.)</p>
      <p className="info">
        <a href="https://github.com/noobieyuh/Spot-The-Phish" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </>
  );
}
