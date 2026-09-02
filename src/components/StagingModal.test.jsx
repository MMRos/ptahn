import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import StagingModal from './StagingModal';

describe('StagingModal - Scene Image Generator from Chat Messages & Characters', () => {
  const mockCharacters = [
    { id: 'char-elena', title: 'Elena la Cazadora', cover: 'https://example.com/elena.jpg', traits: ['Arquera', 'Sigilosa'] },
    { id: 'char-garrison', title: 'Garrison', cover: '', traits: ['Guerrero', 'Valiente'] }
  ];

  const mockMessages = [
    { from: 'narrator', text: 'El viento aúlla entre las ruinas del templo antiguo.' },
    { from: 'user', text: 'Preparo mi arco y me oculto entre las sombras.' },
    { from: 'ai', text: 'Garrison levanta su escudo esperando la emboscada del enemigo.' }
  ];

  test('renders modal with characters, messages and style configuration when open', () => {
    render(
      <StagingModal
        isOpen={true}
        onClose={jest.fn()}
        characters={mockCharacters}
        messages={mockMessages}
        onGenerateImage={jest.fn()}
      />
    );

    expect(screen.getByText(/escenificación/i)).toBeInTheDocument();
    expect(screen.getByText('Elena la Cazadora')).toBeInTheDocument();
    expect(screen.getByText('Garrison')).toBeInTheDocument();

    const msgsList = document.querySelector('.staging-msgs-list');
    expect(within(msgsList).getByText(/el viento aúlla entre las ruinas/i)).toBeInTheDocument();
    expect(within(msgsList).getByText(/preparo mi arco/i)).toBeInTheDocument();
    expect(within(msgsList).getByText(/garrison levanta su escudo/i)).toBeInTheDocument();

    // Selectores de estilo y proporción
    expect(screen.getByTestId('staging-style-select')).toBeInTheDocument();
    expect(screen.getByTestId('staging-aspect-select')).toBeInTheDocument();
  });

  test('allows toggling characters and messages, assembling prompt and calling onGenerateImage', async () => {
    const handleGenerate = jest.fn().mockResolvedValue();
    const handleClose = jest.fn();

    render(
      <StagingModal
        isOpen={true}
        onClose={handleClose}
        characters={mockCharacters}
        messages={mockMessages}
        onGenerateImage={handleGenerate}
      />
    );

    // Seleccionar personaje Elena
    const elenaItem = screen.getByText('Elena la Cazadora').closest('.staging-card-item');
    fireEvent.click(elenaItem);

    // Cambiar estilo a Anime 2.5D
    const styleSelect = screen.getByTestId('staging-style-select');
    fireEvent.change(styleSelect, { target: { value: 'Anime / Ilustración Estilizada 2.5D' } });

    // Cambiar proporción a Vertical
    const aspectSelect = screen.getByTestId('staging-aspect-select');
    fireEvent.change(aspectSelect, { target: { value: 'portrait' } });

    // Escribir detalle adicional
    const extraInput = screen.getByPlaceholderText(/iluminación, clima, composición/i);
    fireEvent.change(extraInput, { target: { value: 'Lluvia intensa y relámpagos' } });

    // Clic en Generar
    const generateBtn = screen.getByRole('button', { name: /generar imagen de escena/i });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(handleGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'Anime / Ilustración Estilizada 2.5D',
        width: 512,
        height: 768,
        characterIds: expect.arrayContaining(['char-elena']),
        prompt: expect.stringContaining('Elena la Cazadora')
      })
    );
  });

  test('calls onClose when clicking cancel or close button', () => {
    const handleClose = jest.fn();

    render(
      <StagingModal
        isOpen={true}
        onClose={handleClose}
        characters={mockCharacters}
        messages={mockMessages}
        onGenerateImage={jest.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
