import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormattedMessageText, renderInlineFormattedText, findMatchingEntity, normalizeEntityName } from './textFormatter';

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

  test('renders nested ==tags== inside action *...*', () => {
    const onTagClickMock = jest.fn();
    const appData = {
      cards: [{ title: 'pueblo de Garrison', type: 'Lugar' }]
    };
    const text = '*Un viento cálido sopla mientras contemplas el ==pueblo de Garrison== ante ti.*';

    const { container } = render(
      <FormattedMessageText 
        text={text} 
        onTagClick={onTagClickMock} 
        appData={appData} 
      />
    );

    const actionEl = container.querySelector('.msg-action');
    expect(actionEl).toBeInTheDocument();
    const markEl = actionEl.querySelector('.msg-highlight');
    expect(markEl).toBeInTheDocument();
    expect(markEl.textContent).toContain('pueblo de Garrison');
    expect(markEl.classList.contains('existing-card')).toBe(true);

    fireEvent.click(markEl);
    expect(onTagClickMock).toHaveBeenCalledWith('pueblo de Garrison', appData.cards[0]);
  });

  test('renders nested ==tags== inside spoken dialogue "..."', () => {
    const onTagClickMock = jest.fn();
    const appData = {
      cards: [{ title: 'Garrison', type: 'Lugar' }]
    };
    const text = '"¡Bienvenido a ==Garrison==, forastero!"';

    const { container } = render(
      <FormattedMessageText 
        text={text} 
        onTagClick={onTagClickMock} 
        appData={appData} 
      />
    );

    const dialogueEl = container.querySelector('.msg-dialogue');
    expect(dialogueEl).toBeInTheDocument();
    const markEl = dialogueEl.querySelector('.msg-highlight');
    expect(markEl).toBeInTheDocument();
    expect(markEl.textContent).toContain('Garrison');

    fireEvent.click(markEl);
    expect(onTagClickMock).toHaveBeenCalledWith('Garrison', appData.cards[0]);
  });

  test('matches entities flexibly despite leading articles (La Forja vs Forja)', () => {
    const onTagClickMock = jest.fn();
    const appData = {
      scenarios: [{ id: 'sc-1', title: 'La Forja', type: 'Escenario' }],
      cards: [{ id: 'c-1', title: 'Garrick el Forjador', type: 'Personaje' }]
    };
    const text = 'Entras en ==Forja== y ves a ==Garrick== trabajando.';

    const { container } = render(
      <FormattedMessageText 
        text={text} 
        onTagClick={onTagClickMock} 
        appData={appData} 
      />
    );

    const markEls = container.querySelectorAll('.msg-highlight');
    expect(markEls.length).toBe(2);
    expect(markEls[0].classList.contains('existing-card')).toBe(true);
    expect(markEls[1].classList.contains('existing-card')).toBe(true);

    fireEvent.click(markEls[0]);
    expect(onTagClickMock).toHaveBeenCalledWith('Forja', appData.scenarios[0]);
  });

  test('normalizes entity names accurately', () => {
    expect(normalizeEntityName('La Forja')).toBe('forja');
    expect(normalizeEntityName('El Dragón')).toBe('dragon');
    expect(normalizeEntityName('  The Blacksmith!  ')).toBe('blacksmith');
    expect(normalizeEntityName('Un Castillo')).toBe('castillo');
  });

  test('findMatchingEntity finds matching cards and scenarios', () => {
    const appData = {
      scenarios: [{ id: 'sc-1', title: 'La Forja' }],
      cards: [
        { id: 'c-1', title: 'Ignis', type: 'Personaje' },
        { id: 'c-2', title: 'Volker el Sabio', type: 'Personaje' }
      ]
    };

    expect(findMatchingEntity('Forja', appData)).toBe(appData.scenarios[0]);
    expect(findMatchingEntity('la forja', appData)).toBe(appData.scenarios[0]);
    expect(findMatchingEntity('Ignis', appData)).toBe(appData.cards[0]);
    expect(findMatchingEntity('Volker', appData)).toBe(appData.cards[1]);
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

  test('renders exactly one icon per dialogue without duplicate icons', () => {
    const text = '"Hola, dueño." *Sonríe suavemente.*';
    const { container } = render(<FormattedMessageText text={text} />);
    const dialogueIcons = container.querySelectorAll('.dialogue-icon');
    expect(dialogueIcons.length).toBe(1);
  });

  test('gracefully formats unclosed streaming dialogue chunks', () => {
    const text = '"¡Hola aventurero en proceso';
    const { container } = render(<FormattedMessageText text={text} />);
    const dialogueSpan = container.querySelector('.msg-dialogue');
    expect(dialogueSpan).toBeInTheDocument();
    expect(dialogueSpan.textContent).toContain('¡Hola aventurero en proceso');
  });

  test('cleans quotes with asterisks ("*dialogue*" and *"dialogue"*) into clean dialogue without asterisks', () => {
    const rawText = '"*¡Dueño!*" she wraps her arms around your neck. "*¡Hmmm! ¡Si! ¡Mas!*" *~Ahhh... secreto~*';
    const { container } = render(<FormattedMessageText text={rawText} />);
    
    const dialogues = container.querySelectorAll('.msg-dialogue');
    expect(dialogues.length).toBe(2);
    expect(dialogues[0].textContent).toBe('"¡Dueño!"');
    expect(dialogues[1].textContent).toBe('"¡Hmmm! ¡Si! ¡Mas!"');

    const thoughts = container.querySelectorAll('.msg-thought');
    expect(thoughts.length).toBe(1);
    expect(thoughts[0].textContent).toContain('Ahhh... secreto');
  });
});
