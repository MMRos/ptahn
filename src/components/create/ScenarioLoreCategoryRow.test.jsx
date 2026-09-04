import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScenarioLoreCategoryRow from './ScenarioLoreCategoryRow';

describe('ScenarioLoreCategoryRow Component', () => {
  const mockCards = [
    { id: 'c1', title: 'Héroe Legendario', type: 'Personaje' },
    { id: 'c2', title: 'Villano Sombrío', type: 'Personaje' }
  ];

  test('renders category header with label and badge count', () => {
    render(
      <ScenarioLoreCategoryRow
        type="Personaje"
        typeLabel="Personajes"
        cards={mockCards}
        onOpenNewCardModal={jest.fn()}
        onOpenEditCardModal={jest.fn()}
        onUnlinkCard={jest.fn()}
        onReorderCategoryCards={jest.fn()}
      />
    );

    expect(screen.getByText('Personajes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Héroe Legendario')).toBeInTheDocument();
    expect(screen.getByText('Villano Sombrío')).toBeInTheDocument();
  });

  test('toggles collapsed/expanded state when clicking header', () => {
    render(
      <ScenarioLoreCategoryRow
        type="Personaje"
        typeLabel="Personajes"
        cards={mockCards}
        defaultExpanded={true}
        onOpenNewCardModal={jest.fn()}
        onOpenEditCardModal={jest.fn()}
        onUnlinkCard={jest.fn()}
        onReorderCategoryCards={jest.fn()}
      />
    );

    expect(screen.getByText('Héroe Legendario')).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByText('Personajes'));
    expect(screen.queryByText('Héroe Legendario')).not.toBeInTheDocument();

    // Click header again to expand
    fireEvent.click(screen.getByText('Personajes'));
    expect(screen.getByText('Héroe Legendario')).toBeInTheDocument();
  });

  test('calls onOpenNewCardModal when clicking + Crear button without toggling collapse', () => {
    const handleNew = jest.fn();
    render(
      <ScenarioLoreCategoryRow
        type="Personaje"
        typeLabel="Personajes"
        cards={mockCards}
        onOpenNewCardModal={handleNew}
        onOpenEditCardModal={jest.fn()}
        onUnlinkCard={jest.fn()}
        onReorderCategoryCards={jest.fn()}
      />
    );

    const createBtn = screen.getByText('Crear Personaje');
    fireEvent.click(createBtn);
    expect(handleNew).toHaveBeenCalledWith('Personaje');
    // Still expanded
    expect(screen.getByText('Héroe Legendario')).toBeInTheDocument();
  });
});
