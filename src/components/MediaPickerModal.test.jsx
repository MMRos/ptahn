import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaPickerModal from './MediaPickerModal';

describe('MediaPickerModal Component', () => {
  test('renders correctly when open and switches tabs', () => {
    const handleClose = jest.fn();
    const handleSave = jest.fn();

    render(
      <MediaPickerModal 
        isOpen={true}
        onClose={handleClose}
        title="Personalizar Avatar"
        type="avatar"
        currentValue="https://example.com/avatar.jpg"
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Personalizar Avatar')).toBeInTheDocument();
    expect(screen.getByText('Subir Archivo')).toBeInTheDocument();
    expect(screen.getByText('Enlace / Galería')).toBeInTheDocument();
    expect(screen.getByText('Generar con IA')).toBeInTheDocument();

    // Switch to Link / Gallery tab
    fireEvent.click(screen.getByText('Enlace / Galería'));
    expect(screen.getByText(/URL Directa de la Imagen/i)).toBeInTheDocument();

    // Switch to AI tab
    fireEvent.click(screen.getByText('Generar con IA'));
    expect(screen.getByText(/Prompt de Generación Visual/i)).toBeInTheDocument();
    expect(screen.getByText('Sintetizar')).toBeInTheDocument();
  });

  test('calls onSave when Guardar button is clicked', () => {
    const handleSave = jest.fn();
    const handleClose = jest.fn();

    render(
      <MediaPickerModal 
        isOpen={true}
        onClose={handleClose}
        title="Personalizar Fondo de Cabecera"
        type="cover"
        currentValue="https://example.com/cover.jpg"
        onSave={handleSave}
      />
    );

    const saveBtn = screen.getByText(/Guardar como Fondo de Portada/i);
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith('https://example.com/cover.jpg');
    expect(handleClose).toHaveBeenCalled();
  });
});
