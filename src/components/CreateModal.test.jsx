import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateModal from './CreateModal';
import * as aiEnhancer from '../utils/aiEnhancer';

jest.mock('../utils/aiEnhancer', () => ({
  enhanceFieldWithAI: jest.fn(),
  autoCompleteEntityWithAI: jest.fn()
}));

jest.mock('../utils/localAIStudio', () => ({
  generateImageLocal: jest.fn(() => Promise.resolve('data:image/png;base64,mocked')),
  editImageWithAI: jest.fn(() => Promise.resolve('data:image/png;base64,edited')),
  loadChatSettings: jest.fn(() => ({ preferredImageModel: 'test.safetensors' })),
  translateVisualPromptToEnglish: jest.fn((p) => Promise.resolve(p)),
  getNegativePromptForModel: jest.fn(() => 'low quality'),
  getBaseUrl: jest.fn(() => 'http://localhost:3001'),
  resolveIntermediaryModelId: jest.fn(() => Promise.resolve('test-model')),
  apiFetch: jest.fn()
}));

jest.mock('../utils/aiLogEmitter', () => ({
  emitAILog: jest.fn()
}));

describe('CreateModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default type Personaje and default role No Jugable (PNJ)', () => {
    render(
      <CreateModal
        isOpen={true}
        onClose={jest.fn()}
        onSaveItem={jest.fn()}
      />
    );

    const typeSelect = screen.getByDisplayValue('Personaje');
    expect(typeSelect).toBeInTheDocument();

    const npcRadio = screen.getByRole('radio', { name: /no jugable/i });
    expect(npcRadio).toBeChecked();
  });

  test('resets all form fields cleanly when opening for new item', () => {
    const { rerender } = render(
      <CreateModal
        isOpen={true}
        editItem={{
          id: 'card-1',
          type: 'Personaje',
          title: 'Tarjeta Previa',
          intro: 'Intro previa',
          text: 'Lore previo',
          characterRole: 'user_persona'
        }}
        onClose={jest.fn()}
        onSaveItem={jest.fn()}
      />
    );

    expect(screen.getByDisplayValue('Tarjeta Previa')).toBeInTheDocument();

    // Rerender with editItem null
    rerender(
      <CreateModal
        isOpen={true}
        editItem={null}
        onClose={jest.fn()}
        onSaveItem={jest.fn()}
      />
    );

    const titleInput = screen.getByPlaceholderText(/nombre o título/i);
    expect(titleInput.value).toBe('');

    const introInput = screen.getByPlaceholderText(/primer contacto o introducción/i);
    expect(introInput.value).toBe('');

    const textInput = screen.getByPlaceholderText(/detalles visuales, vestimenta/i);
    expect(textInput.value).toBe('');
  });

  test('saves new card with onSaveItem when Guardar is clicked', () => {
    const handleSaveItem = jest.fn();
    render(
      <CreateModal
        isOpen={true}
        onClose={jest.fn()}
        onSaveItem={handleSaveItem}
      />
    );

    const titleInput = screen.getByPlaceholderText(/nombre o título/i);
    fireEvent.change(titleInput, { target: { value: 'Nuevo Héroe' } });

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    expect(handleSaveItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'card',
        data: expect.objectContaining({
          title: 'Nuevo Héroe',
          type: 'Personaje',
          characterRole: 'npc'
        })
      })
    );
  });

  test('triggers AI field enhancement when clicking enhance button', async () => {
    aiEnhancer.enhanceFieldWithAI.mockResolvedValueOnce('Intro generada por IA');

    render(
      <CreateModal
        isOpen={true}
        onClose={jest.fn()}
        onSaveItem={jest.fn()}
      />
    );

    const enhanceIntroBtn = screen.getByRole('button', { name: /mejorar con ia/i });
    fireEvent.click(enhanceIntroBtn);

    await waitFor(() => {
      expect(aiEnhancer.enhanceFieldWithAI).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldType: 'intro',
          entityType: 'Personaje'
        })
      );
    });
  });
});
