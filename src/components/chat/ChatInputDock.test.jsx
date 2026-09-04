import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInputDock from './ChatInputDock';

describe('ChatInputDock - Icon-Only Tool Buttons with Hover Tooltips', () => {
  const defaultProps = {
    input: '',
    setInput: jest.fn(),
    isSending: false,
    onSendMessage: jest.fn(),
    onContinue: jest.fn(),
    onRedo: jest.fn(),
    onOpenStaging: jest.fn(),
    onBranchChat: jest.fn(),
    onTogglePeek: jest.fn(),
    isPeekTransparent: false,
    autoGenCards: true,
    onToggleAutoGenCards: jest.fn(),
    isSelectingForCard: false,
    onToggleSelectingForCard: jest.fn(),
    chatSettings: { sendOnShiftEnter: false },
    onUpdateChatSettings: jest.fn(),
    isRecordingAudio: false,
    onToggleAudioRecording: jest.fn(),
    textareaRef: { current: document.createElement('textarea') },
    isSidebarVisible: true,
    isCharacterSidebarClosed: false,
    activeCharacter: null,
    onOpenSidebar: jest.fn()
  };

  test('renders tool buttons with icons, title tooltips and aria-labels without visible inner text', () => {
    render(<ChatInputDock {...defaultProps} />);

    // Botones de formato a la izquierda
    const btnDialogo = screen.getByRole('button', { name: /diálogo/i });
    const btnAccion = screen.getByRole('button', { name: /acción/i });
    const btnPensamiento = screen.getByRole('button', { name: /pensamiento/i });
    const btnResaltar = screen.getByRole('button', { name: /resaltar/i });
    const btnVerFondo = screen.getByRole('button', { name: /ver fondo/i });

    // Botones de acción a la derecha
    const btnContinuar = screen.getByRole('button', { name: /continuar/i });
    const btnRehacer = screen.getByRole('button', { name: /rehacer/i });
    const btnEscenificar = screen.getByRole('button', { name: /escenificar/i });
    const btnRamificar = screen.getByRole('button', { name: /ramificar/i });

    // Todos los botones deben tener atributo title descriptivo (el "alt" en hover)
    expect(btnDialogo).toHaveAttribute('title');
    expect(btnDialogo.getAttribute('title')).toMatch(/diálogo/i);

    expect(btnAccion).toHaveAttribute('title');
    expect(btnAccion.getAttribute('title')).toMatch(/acción/i);

    expect(btnPensamiento).toHaveAttribute('title');
    expect(btnPensamiento.getAttribute('title')).toMatch(/pensamiento/i);

    expect(btnResaltar).toHaveAttribute('title');
    expect(btnResaltar.getAttribute('title')).toMatch(/resaltar/i);

    expect(btnVerFondo).toHaveAttribute('title');
    expect(btnVerFondo.getAttribute('title')).toMatch(/fondo/i);

    expect(btnContinuar).toHaveAttribute('title');
    expect(btnContinuar.getAttribute('title')).toMatch(/continuar/i);

    expect(btnRehacer).toHaveAttribute('title');
    expect(btnRehacer.getAttribute('title')).toMatch(/rehacer/i);

    expect(btnEscenificar).toHaveAttribute('title');
    expect(btnEscenificar.getAttribute('title')).toMatch(/escenificar/i);

    expect(btnRamificar).toHaveAttribute('title');
    expect(btnRamificar.getAttribute('title')).toMatch(/ramificar/i);

    // Ninguno de estos botones debe contener etiquetas <span> con texto visible
    const toolButtons = [
      btnDialogo, btnAccion, btnPensamiento, btnResaltar, btnVerFondo,
      btnContinuar, btnRehacer, btnEscenificar, btnRamificar
    ];

    toolButtons.forEach(btn => {
      const span = btn.querySelector('span');
      expect(span).toBeNull();
    });
  });

  test('action buttons trigger their respective callbacks on click', () => {
    const onContinueMock = jest.fn();
    const onRedoMock = jest.fn();
    const onStagingMock = jest.fn();
    const onBranchMock = jest.fn();

    render(
      <ChatInputDock
        {...defaultProps}
        onContinue={onContinueMock}
        onRedo={onRedoMock}
        onOpenStaging={onStagingMock}
        onBranchChat={onBranchMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(onContinueMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /rehacer/i }));
    expect(onRedoMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /escenificar/i }));
    expect(onStagingMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /ramificar/i }));
    expect(onBranchMock).toHaveBeenCalledTimes(1);
  });

  test('send button toggles to interactive stop button when isSending is true and triggers onStop', () => {
    const onStopMock = jest.fn();
    const { rerender } = render(
      <ChatInputDock
        {...defaultProps}
        isSending={false}
        input="Hola mundo"
        onStop={onStopMock}
      />
    );

    const sendBtn = screen.getByRole('button', { name: /enviar mensaje/i });
    expect(sendBtn).not.toBeDisabled();
    expect(sendBtn).toHaveAttribute('type', 'submit');

    // Rerender en modo isSending = true
    rerender(
      <ChatInputDock
        {...defaultProps}
        isSending={true}
        input="Hola mundo"
        onStop={onStopMock}
      />
    );

    const stopBtn = screen.getByRole('button', { name: /detener respuesta/i });
    expect(stopBtn).not.toBeDisabled();
    expect(stopBtn).toHaveClass('is-stopping');

    fireEvent.click(stopBtn);
    expect(onStopMock).toHaveBeenCalledTimes(1);
  });

  test('dynamically adjusts textarea height based on content to grow with text', () => {
    const textareaRef = { current: null };
    const { rerender } = render(
      <ChatInputDock
        {...defaultProps}
        input=""
        textareaRef={textareaRef}
      />
    );

    const textarea = screen.getByPlaceholderText(/escribe tu acción o diálogo/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.style.height).toBe('44px');

    // Simulate multi-line content
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 96
    });

    rerender(
      <ChatInputDock
        {...defaultProps}
        input="Línea 1\nLínea 2\nLínea 3"
        textareaRef={textareaRef}
      />
    );

    expect(textarea.style.height).toBe('96px');
    expect(textarea.style.overflowY).toBe('hidden');

    // Simulate very long text exceeding max height
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 300
    });

    rerender(
      <ChatInputDock
        {...defaultProps}
        input={"Mucho texto...\n".repeat(15)}
        textareaRef={textareaRef}
      />
    );

    expect(textarea.style.height).toBe('220px');
    expect(textarea.style.overflowY).toBe('auto');
  });
});
