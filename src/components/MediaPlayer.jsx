import React from 'react';
import './MediaPlayer.css';

function MediaPlayer({ url, type, color }) {
  if (!url) return null;

  return (
    <div className="media-player" style={{ borderColor: color }}>
      <div className="media-header" style={{ backgroundColor: `${color}20` }}>
        <span className="media-title">{type === 'video' ? '🎬 Watch Video' : '🎵 Listen to Audio'}</span>
      </div>
      <div className="media-content">
        {type === 'video' ? (
          <video controls className="video-element">
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <audio controls className="audio-element">
            <source src={url} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
    </div>
  );
}

export default MediaPlayer;
