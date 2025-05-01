import React, { useState } from 'react';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

export default function ImageViewer({ image, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    const scaleFactor = 0.1;
    const newScale = e.deltaY > 0 ? Math.max(1, scale - scaleFactor) : scale + scaleFactor;
    setScale(newScale);
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setStartPosition({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - startPosition.x, y: e.clientY - startPosition.y });
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <Dialog open={Boolean(image)} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogContent
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          background: '#fff',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '90vh'
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
          }}
        >
          <Close />
        </IconButton>

        {image && (
          <img
            src={image.image_path}
            alt="הגדלת תמונה"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
