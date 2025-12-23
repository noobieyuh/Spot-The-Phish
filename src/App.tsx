import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/electron-vite.animate.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Spot The Phish</h1>
      <p className="info">
        Upload a <code> .txt </code> file to get started using the button below :p
      </p>
      <div className="card">
        <button>
          Upload File
        </button>
      </div>
      <p className="info">
        (This is a prototype, this is not an accurate representation of the final product)
      </p>
    </>
  )
}

export default App
