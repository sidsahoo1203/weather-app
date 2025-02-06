import React from 'react'
import Weather from './components/Weather'

const App = () => {
  return (
    <div className='app'>
      <Weather/>
      <div className='tutorial'>
        <p>Watch the tutorial video:</p>
        <a 
          href="https://youtu.be/zs1Nq2s_uy4?si=YyGBtye44LM9xxTX" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Weather App using React JS Basic Project Tutorial.
        </a>
      </div>
    </div>
  )
}

export default App


      