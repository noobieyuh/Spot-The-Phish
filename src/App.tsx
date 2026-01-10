import './App.css'

function uploadFile()
{
  window.electronAPI.openFileDialog().then((filePath: string | null) => {
    if (filePath) {
      document.getElementById('results')!.innerHTML = 'Rating: (WIP)'
    }
  })
}

function App() {

  return (
    <>
      <h1>Spot The Phish</h1>
      <p className="info">
        Upload a <code> .txt </code> file to get started using the button below
      </p>
      <div className="card">
        <button onClick={uploadFile}>
          Upload File
        </button>
      </div>
      <p id="results">Results will be here!</p>
      <p className="info">
        (This is a prototype, this is not an accurate representation of the final product)
      </p>
      <p className="info">
        <a href='https://github.com/noobieyuh/Spot-The-Phish' target='_blank'>GitHub</a>
      </p>
    </>
  )
}

export default App
