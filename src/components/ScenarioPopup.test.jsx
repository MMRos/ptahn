import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScenarioPopup from './ScenarioPopup';

describe('ScenarioPopup - Multiple Initial Messages Selection & Context Isolation', () => {
  const singleStartScenario = {
    id: 'sc-single',
    title: 'La Cripta Olvidada',
    category: 'Fantasía',
    intro: 'Una antigua cripta subterránea.',
    presentation: 'Desciendes los escalones de piedra hacia la oscuridad.'
  };

  const multiStartScenario = {
    id: 'sc-multi',
    title: 'Asedio a la Fortaleza',
    category: 'Acción',
    intro: 'La fortaleza está rodeada por el ejército enemigo.',
    presentation: 'Estás en las almenas observando el avance.',
    initialMessages: [
      { id: 'init-almenas', title: 'Almenas', text: 'Estás en las almenas observando el avance.' },
      { id: 'init-infiltracion', title: 'Infiltración', text: 'Te deslizas por las alcantarillas de la fortaleza.' },
      { id: 'init-prision', title: 'Prisión Subterránea', text: 'Estás cautivo en las celdas inferiores esperando el rescate.' }
    ],
    activeInitialMessageId: 'init-almenas'
  };

  test('renders standard presentation for scenario with single start', () => {
    render(
      <ScenarioPopup
        isOpen={true}
        scenario={singleStartScenario}
        onClose={jest.fn()}
        onStartChat={jest.fn()}
      />
    );

    expect(screen.getByText('La Cripta Olvidada')).toBeInTheDocument();
    expect(screen.getByText('Desciendes los escalones de piedra hacia la oscuridad.')).toBeInTheDocument();
    // No tab bar should be rendered when there is only one start
    expect(screen.queryByText(/selecciona tu punto de partida/i)).not.toBeInTheDocument();
  });

  test('renders tab bar and allows player to select alternate start', () => {
    const handleStartChat = jest.fn();

    render(
      <ScenarioPopup
        isOpen={true}
        scenario={multiStartScenario}
        onClose={jest.fn()}
        onStartChat={handleStartChat}
      />
    );

    expect(screen.getByText(/selecciona tu punto de partida/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Almenas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Infiltración' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prisión Subterránea' })).toBeInTheDocument();

    // Default visible start is Almenas
    expect(screen.getByText('Estás en las almenas observando el avance.')).toBeInTheDocument();

    // Click Infiltración tab
    fireEvent.click(screen.getByRole('button', { name: 'Infiltración' }));

    // Visible text updates to Infiltración
    expect(screen.getByText('Te deslizas por las alcantarillas de la fortaleza.')).toBeInTheDocument();
    expect(screen.queryByText('Estás en las almenas observando el avance.')).not.toBeInTheDocument();

    // Click Empezar chat -> onStartChat receives scenario with strictly the selected visible start
    fireEvent.click(screen.getByRole('button', { name: /empezar chat/i }));

    expect(handleStartChat).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sc-multi',
        presentation: 'Te deslizas por las alcantarillas de la fortaleza.',
        activeInitialMessageId: 'init-infiltracion'
      })
    );
  });
});
