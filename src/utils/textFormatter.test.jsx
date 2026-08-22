import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormattedMessageText, renderInlineFormattedText } from './textFormatter';

describe('Text Formatter Tests', () => {
  test('renders spoken dialogue with dialogue-icon', () => {
    const text = '"Hola aventurero"';
    const { container } = render(<FormattedMessageText text={text} />);
    const dialogueSpan = container.querySelector('.msg-dialogue');
    expect(dialogueSpan).toBeInTheDocument();
    expect(dialogueSpan.textContent).toContain('Hola aventurero');
  });

  test('renders actions in italics with action-icon', () => {
    const text = '*El tabernero asiente en silencio*';
    const { container } = render(<FormattedMessageText text={text} />);
    const actionEl = container.querySelector('.msg-action');
    expect(actionEl).toBeInTheDocument();
    expect(actionEl.textContent).toContain('El tabernero asiente en silencio');
  });

  test('renders thought with thought-icon', () => {
    const text = '~¿Será de fiar?~';
    const { container } = render(<FormattedMessageText text={text} />);
    const thoughtSpan = container.querySelector('.msg-thought');
    expect(thoughtSpan).toBeInTheDocument();
    expect(thoughtSpan.textContent).toContain('¿Será de fiar?');
  });

  test('renders bold formatting', () => {
    const text = '**Peligro Inminente**';
    const { container } = render(<FormattedMessageText text={text} />);
    const boldEl = container.querySelector('.msg-bold');
    expect(boldEl).toBeInTheDocument();
    expect(boldEl.textContent).toBe('Peligro Inminente');
  });

  test('renders interactive highlighted tags and triggers onTagClick', () => {
    const onTagClickMock = jest.fn();
    const appData = {
      cards: [{ title: 'Vallebruma', type: 'Lugar' }]
    };
    const text = 'Llegamos a ==Vallebruma== al anochecer.';

    const { container } = render(
      <FormattedMessageText 
        text={text} 
        onTagClick={onTagClickMock} 
        appData={appData} 
      />
    );

    const markEl = container.querySelector('.msg-highlight');
    expect(markEl).toBeInTheDocument();
    expect(markEl.classList.contains('existing-card')).toBe(true);
    expect(markEl.textContent).toContain('Vallebruma');

    fireEvent.click(markEl);
    expect(onTagClickMock).toHaveBeenCalledWith('Vallebruma', appData.cards[0]);
  });

  test('collapses and expands <think> block correctly', () => {
    const text = '<think>Analizando intenciones...</think> *Te observa con cautela.*';
    const { container } = render(<FormattedMessageText text={text} />);
    
    expect(screen.getByText(/Pensamiento del Narrador/i)).toBeInTheDocument();
    expect(screen.queryByText(/Analizando intenciones.../i)).not.toBeInTheDocument();

    const thinkHeader = container.querySelector('.msg-think-box > div');
    fireEvent.click(thinkHeader);
    expect(screen.getByText(/Analizando intenciones.../i)).toBeInTheDocument();
  });
});
