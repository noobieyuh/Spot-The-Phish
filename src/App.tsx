import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import * as tf from '@tensorflow/tfjs';

// -----------------------------
// File Reading
// -----------------------------
function readUserFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// -----------------------------
// Feature Extraction (14 features)
// -----------------------------
function preprocess(text: string): tf.Tensor {
  const cleaned = text.trim().toLowerCase();

  // Example simple 14‑feature vector
  const features = [
    cleaned.length,                                // 1. total characters
    cleaned.split(/\s+/).length,                   // 2. word count
    (cleaned.match(/[A-Z]/g) || []).length,        // 3. uppercase count
    (cleaned.match(/[0-9]/g) || []).length,        // 4. digit count
    (cleaned.match(/https?:\/\//g) || []).length,  // 5. link count
    (cleaned.match(/@/g) || []).length,            // 6. @ symbols
    (cleaned.match(/\$/g) || []).length,           // 7. $ symbols
    (cleaned.match(/!/g) || []).length,            // 8. exclamation marks
    (cleaned.match(/\?/g) || []).length,           // 9. question marks
    (cleaned.match(/free|win|urgent|click/gi) || []).length, // 10. spam words
    cleaned.includes("password") ? 1 : 0,          // 11. password flag
    cleaned.includes("verify") ? 1 : 0,            // 12. verify flag
    cleaned.includes("account") ? 1 : 0,           // 13. account flag
    cleaned.includes("bank") ? 1 : 0               // 14. bank flag
  ];

  return tf.tensor2d([features], [1, 14]);
}

// -----------------------------
// React Component
// -----------------------------
export default function App() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState('Results will be here!');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const loaded = await tf.loadLayersModel('/tfjs_model/model.json');
        if (mounted) setModel(loaded);
      } catch (err) {
        console.error(err);
        if (mounted) setResult('Failed to load model.');
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

      const raw = model.predict(inputTensor) as tf.Tensor | tf.Tensor[];
      const output = Array.isArray(raw) ? raw[0] : raw;

      const [prob] = await output.data();

      raw instanceof Array ? raw.forEach(t => t.dispose()) : raw.dispose();
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
