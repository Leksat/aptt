import React, { useState } from 'react';
import { RichTextarea } from 'rich-textarea';

import { core } from '../lib/core';
import { store } from '../lib/store';

export const Notes = () => {
  const [text, setText] = useState(store.get('notes'));
  const [currentItem, setCurrentItem] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button
        type="button"
        style={{ margin: '0 10px 0 10px', maxWidth: 'fit-content' }}
        disabled={!currentItem}
        onClick={() => {
          core.addNewEntry(currentItem);
          core.focusToTextarea(100);
        }}
      >
        New from selected
      </button>
      <div
        style={{
          flexGrow: 1,
          height: '100%',
          padding: 10,
        }}
      >
        <RichTextarea
          data-testid="textarea"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            store.set('notes', event.target.value);
          }}
          onSelectionChange={(pos) => {
            const lineNr =
              text.substring(0, pos.selectionStart).split('\n').length - 1;
            const line = text.split('\n')[lineNr]!;
            const withoutComment = line.replace(/#.*/, '');
            setCurrentItem(withoutComment.trim());
          }}
          nonce=""
          style={{
            height: '100%',
            width: '100%',
            padding: 0,
            border: 0,
            resize: 'none',
            outline: 'none',
          }}
        >
          {(text) => {
            return text.split('\n').map((line, i) => {
              if (!line.trim()) {
                return <div key={i}>&nbsp;</div>;
              }
              const commentStartsAt = line.indexOf('#');
              if (commentStartsAt === -1) {
                return <div key={i}>{line}</div>;
              }
              return (
                <div key={i}>
                  {line.slice(0, commentStartsAt)}
                  <span className="hint">{line.slice(commentStartsAt)}</span>
                </div>
              );
            });
          }}
        </RichTextarea>
      </div>
    </div>
  );
};

export const defaultNotes = `# Put a cursor on a line and hit the button above

# Everything that starts with a hash is a comment and will not be sent to Jira

# Your notes may look something like the following

## My favorites

ASD-1 Working on stuff
ASD-2 # Project meetings
ASD-3 ! # General meetings
#     ^ Tip: If an entry description starts with an exclamation mark, the app will refuse submitting the entries. In this case it is used as a reminder to add a description.

## My todos

+ read the stuff above
- delete everything here`;
