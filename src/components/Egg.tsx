import { appWindow } from '@tauri-apps/api/window';
import { useEffect, useState } from 'react';

let isRunning = false;

export default function Egg() {
  const [isVisible, setIsVisible] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    appWindow.listen('show-egg', () => {
      setIsVisible(true);
      (async () => {
        if (isRunning) {
          return;
        }
        isRunning = true;
        setText('');
        for (const row of song.trim().split('\n')) {
          for (const item of row.split(' ')) {
            if (item.match(/^\d+$/)) {
              const delay = parseInt(item, 10);
              await new Promise((resolve) => {
                setTimeout(() => {
                  resolve(null);
                }, delay);
              });
            } else {
              setText((text) => text + ' ' + item);
            }
          }
          setText((text) => text + '\n');
        }
        isRunning = false;
      })();
    });
  }, []);
  return (
    <div
      style={
        isVisible
          ? {
              height: '100%',
              width: '100%',
              position: 'fixed',
              left: 0,
              top: 0,
              backgroundColor: 'white',
              padding: '10px',
              zIndex: '100',
            }
          : { display: 'none' }
      }
    >
      <pre>{text}</pre>
      <pre>
        &nbsp;
        <a
          href="https://github.com/Leksat/aptt/blob/bc65d99d647b542b65695be27e3d56cbb7ab0ba2/src-tauri/src/main.rs#L48-L51"
          target="_blank"
          rel="noreferrer"
        >
          WTF
        </a>
      </pre>
      <button
        onClick={() => {
          setIsVisible(false);
        }}
      >
        Hide
      </button>
    </div>
  );
}

const song = `
Don't 1000 close 700 me 600 now 500
🎵 300 🎵 300 🎵 300 🎵 300 🎵 300 🎵 600
Don't 1000 close 700 me 300
'Cause 300 I'm 300 better 400 than 500 awesome, 1000 better 400 than 300 awesome 1300
I'm 100 a 300 perfect 300 app 800 helping 300 track 300 you 300 time 1500
Straight 300 to 300 Jira 1100 I 300 can 300 submit 1500
. 200 . 200 .
`;
