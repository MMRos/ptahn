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

    const introInput = screen.getByPlaceholderText(/introducción/i);
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

  test('renders AI Image Generator for Lugar, Personaje and Raza card types', () => {
    ['Lugar', 'Personaje', 'Raza'].forEach(cardType => {
      const { unmount } = render(
        <CreateModal
          isOpen={true}
          initialType={cardType}
          onClose={jest.fn()}
          onSaveItem={jest.fn()}
        />
      );

      // Bloque del generador de imágenes con IA
      expect(screen.getByText(/generador de imágenes con ia/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/descripción visual \/ expresión/i)).toBeInTheDocument();
      expect(screen.getByTestId('char-ai-style-select')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generar/i })).toBeInTheDocument();

      unmount();
    });
  });

  test('renders ScenarioMediaHeader when itemType is Escenario and preserves top modal header', () => {
    render(
      <CreateModal
        isOpen={true}
        initialType="Escenario"
        onClose={jest.fn()}
        onSaveItem={jest.fn()}
      />
    );

    // Encabezado superior inalterado
    expect(screen.getByDisplayValue('Escenario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre o título del escenario/i)).toBeInTheDocument();
    expect(screen.getByText(/🌐 Público/i)).toBeInTheDocument();
    expect(screen.getByText(/🔞 NSFW/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();

    // Renderiza la sección en dos columnas de ScenarioMediaHeader con controles de IA
    expect(screen.getByText(/cargar imagen/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/descripción visual del escenario/i)).toBeInTheDocument();
    expect(screen.getByTestId('scenario-ai-style-select')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-category-select')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/etiquetas \(escribe y pulsa enter\)\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cargar$/i })).toBeInTheDocument();

    // No debe renderizar la galería genérica de imágenes y expresiones de tarjetas
    expect(screen.queryByText(/imágenes y expresiones \(/i)).not.toBeInTheDocument();
  });

  test('supports adding, editing, switching, deleting and saving multiple initial message tabs for scenarios', () => {
    const handleSave = jest.fn();
    render(
      <CreateModal
        isOpen={true}
        initialType="Escenario"
        onClose={jest.fn()}
        onSaveItem={handleSave}
      />
    );

    // Initial message field with 1 default tab
    expect(screen.getByText(/mensaje inicial/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inicio 1' })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/el texto de bienvenida que verá el jugador al comenzar la partida con este inicio/i);
    fireEvent.change(textarea, { target: { value: 'Texto del primer inicio en la taberna.' } });

    // Click "+ Agregar inicio"
    const addTabBtn = screen.getByRole('button', { name: /agregar inicio/i });
    fireEvent.click(addTabBtn);

    // New tab "Inicio 2" is created and active
    expect(screen.getByRole('button', { name: 'Inicio 2' })).toBeInTheDocument();
    expect(textarea.value).toBe('');

    // Write text in second tab
    fireEvent.change(textarea, { target: { value: 'Texto del segundo inicio en el bosque oscuro.' } });

    // Rename second tab
    const tabNameInput = screen.getByPlaceholderText(/nombre del inicio/i);
    fireEvent.change(tabNameInput, { target: { value: 'Ruta del Bosque' } });
    expect(screen.getByRole('button', { name: 'Ruta del Bosque' })).toBeInTheDocument();

    // Switch back to "Inicio 1"
    fireEvent.click(screen.getByRole('button', { name: 'Inicio 1' }));
    expect(textarea.value).toBe('Texto del primer inicio en la taberna.');

    // Switch back to "Ruta del Bosque"
    fireEvent.click(screen.getByRole('button', { name: 'Ruta del Bosque' }));
    expect(textarea.value).toBe('Texto del segundo inicio en el bosque oscuro.');

    // Set title and save
    const titleInput = screen.getByPlaceholderText(/nombre o título del escenario/i);
    fireEvent.change(titleInput, { target: { value: 'Aventura Boscosa' } });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'scenario',
        data: expect.objectContaining({
          title: 'Aventura Boscosa',
          presentation: 'Texto del segundo inicio en el bosque oscuro.',
          initialMessages: expect.arrayContaining([
            expect.objectContaining({ title: 'Inicio 1', text: 'Texto del primer inicio en la taberna.' }),
            expect.objectContaining({ title: 'Ruta del Bosque', text: 'Texto del segundo inicio en el bosque oscuro.' })
          ])
        })
      })
    );
  });
});




