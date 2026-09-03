import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterModal from './CharacterModal';

describe('CharacterModal - Playable characters & User personas', () => {
  const mockUserCards = [
    {
      id: 'char-1',
      type: 'Personaje',
      title: 'Azgael Master',
      intro: 'Guerrero legendario',
      characterRole: 'user_persona',
      isUserPersona: true,
      traits: ['Valiente', 'Líder']
    },
    {
      id: 'char-2',
      type: 'Personaje',
      title: 'Kaelen el Sabio',
      intro: 'Mago arcano',
      characterRole: 'user_persona',
      isUserPersona: true
    }
  ];

  const mockScenarioCharacters = [
    {
      id: 'sc-1',
      title: 'Aria la Exploradora',
      name: 'Aria la Exploradora',
      intro: 'Arquera del bosque',
      characterRole: 'playable',
      isPlayable: true,
      type: 'Personaje'
    },
    {
      id: 'sc-2',
      title: 'Rey Malakar',
      name: 'Rey Malakar',
      intro: 'Tirano del reino sombrío',
      characterRole: 'npc',
      isPlayable: false,
      type: 'Personaje'
    }
  ];

  test('renders modal with tabs and categorized characters excluding non-playable NPCs', () => {
    const handleSelect = jest.fn();
    render(
      <CharacterModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={handleSelect}
        onOpenCreateCard={jest.fn()}
        userCards={mockUserCards}
        scenarioCharacters={mockScenarioCharacters}
      />
    );

    // Verificamos que se rendericen los nombres de los personajes jugables y personas
    expect(screen.getByText('Azgael Master')).toBeInTheDocument();
    expect(screen.getByText('Aria la Exploradora')).toBeInTheDocument();
    
    // Verificamos que los personajes no jugables (PNJs) NO aparezcan en este modal
    expect(screen.queryByText('Rey Malakar')).not.toBeInTheDocument();

    // Verificamos los badges de PJ
    expect(screen.getByText('🎮 Jugable (PJ)')).toBeInTheDocument();
    expect(screen.getAllByText('🎭 Persona Habitual').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('👥 PNJ')).not.toBeInTheDocument();
  });

  test('filters characters when clicking tabs', () => {
    render(
      <CharacterModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        userCards={mockUserCards}
        scenarioCharacters={mockScenarioCharacters}
      />
    );

    // Click en la pestaña "Jugables (PJ)"
    const playableTab = screen.getByRole('button', { name: /Jugables \(PJ\)/i });
    fireEvent.click(playableTab);

    expect(screen.getByText('Aria la Exploradora')).toBeInTheDocument();
    expect(screen.queryByText('Azgael Master')).not.toBeInTheDocument();

    // Click en la pestaña "Mis Personas"
    const personasTab = screen.getByRole('button', { name: /Mis Personas/i });
    fireEvent.click(personasTab);

    expect(screen.getByText('Azgael Master')).toBeInTheDocument();
    expect(screen.queryByText('Aria la Exploradora')).not.toBeInTheDocument();
  });

  test('allows selecting a character to interpret', () => {
    const handleSelect = jest.fn();
    render(
      <CharacterModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={handleSelect}
        userCards={mockUserCards}
        scenarioCharacters={mockScenarioCharacters}
      />
    );

    const charCard = screen.getByText('Aria la Exploradora');
    fireEvent.click(charCard);

    expect(handleSelect).toHaveBeenCalledWith('Aria la Exploradora');
  });

  test('allows custom quick name entry', () => {
    const handleSelect = jest.fn();
    render(
      <CharacterModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={handleSelect}
        userCards={[]}
        scenarioCharacters={[]}
      />
    );

    const quickBtn = screen.getByText('Nombre rápido');
    fireEvent.click(quickBtn);

    const input = screen.getByPlaceholderText(/Escribe el nombre de tu personaje/i);
    fireEvent.change(input, { target: { value: 'Héroe Desconocido' } });
    
    const startBtn = screen.getByText('Comenzar');
    fireEvent.click(startBtn);

    expect(handleSelect).toHaveBeenCalledWith('Héroe Desconocido');
  });

  test('ignores locations and does not create phantom characters from orphan unresolvable IDs', () => {
    const rawCardsWithPlaceAndOrphan = [
      'orphan-id-1234',
      {
        id: 'place-1',
        title: 'La Gran Forja',
        name: 'La Gran Forja',
        type: 'Lugar'
      },
      {
        id: 'item-1',
        title: 'Espada Mágica',
        name: 'Espada Mágica',
        type: 'Item'
      },
      {
        id: 'sc-hero',
        title: 'Guerrero Elegido',
        name: 'Guerrero Elegido',
        type: 'Personaje',
        isPlayable: true
      }
    ];

    render(
      <CharacterModal
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        userCards={[]}
        scenarioCharacters={rawCardsWithPlaceAndOrphan}
        allCards={[]}
      />
    );

    // El lugar, el item y el id fantasma NO deben aparecer como personajes
    expect(screen.queryByText('orphan-id-1234')).not.toBeInTheDocument();
    expect(screen.queryByText('La Gran Forja')).not.toBeInTheDocument();
    expect(screen.queryByText('Espada Mágica')).not.toBeInTheDocument();

    // Solo el personaje jugable debe ser visible
    expect(screen.getByText('Guerrero Elegido')).toBeInTheDocument();
  });
});
