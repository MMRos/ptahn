import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatsList from './ChatsList';

describe('ChatsList Component', () => {
  test('renders empty message when no chats are available', () => {
    render(<ChatsList recentChats={[]} onOpen={() => {}} onDeleteChat={() => {}} />);
    expect(screen.getByText('Chats guardados')).toBeInTheDocument();
    expect(screen.getByText('No hay chats guardados aún.')).toBeInTheDocument();
  });

  test('renders chat cards and triggers onOpen and onDeleteChat', () => {
    const mockOpen = jest.fn();
    const mockDelete = jest.fn();
    const mockChats = [
      {
        id: 'chat-1',
        scenario: 'Aventura en las Ruinas',
        characterId: 'Héroe',
        messages: [{ from: 'user', text: 'Hola' }, { from: 'ai', text: 'Saludos' }],
        updatedAt: new Date().toISOString()
      }
    ];

    render(
      <ChatsList 
        recentChats={mockChats} 
        onOpen={mockOpen} 
        onDeleteChat={mockDelete} 
      />
    );

    expect(screen.getByText('Aventura en las Ruinas')).toBeInTheDocument();
    expect(screen.getByText(/Personaje: Héroe/)).toBeInTheDocument();

    // Click delete badge
    const deleteBtn = screen.getByTitle('Eliminar partida');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledWith('chat-1');
  });
});
