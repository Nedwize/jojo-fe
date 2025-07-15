import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Character, createSlug, createUser, getUserBySlug } from '@/lib/api';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
  onNameSubmit?: (name: string, userId?: string) => void;
}

const characters: Character[] = [
  {
    name: 'Bunny the Rabbit',
    image: '/bunny.jpg',
    slug: 'bunny',
  },
  {
    name: 'Mimi the Cat',
    image: '/cat.jpg',
    slug: 'cat',
  },
  {
    name: 'Maxie the Pup',
    image: '/dog.jpg',
    slug: 'dog',
  },
  {
    name: 'Jojo the Giraffe',
    image: '/giraffe.jpg',
    slug: 'giraffe',
  },
  {
    name: 'Penny the Penguin',
    image: '/penguin.jpg',
    slug: 'penguin',
  },
];

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  onNameSubmit,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  const [name, setName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      setIsLoading(true);
      try {
        const slug = createSlug(name.trim());
        console.log('Generated slug:', slug);

        // Check if user exists
        const existingUserResponse = await getUserBySlug(slug);

        if (!existingUserResponse) {
          // User doesn't exist, show character selection
          setShowCharacterSelection(true);
        } else {
          console.log('User already exists:', existingUserResponse);
          setSelectedCharacter(
            characters.find((c) => c.slug === existingUserResponse.user.character) ?? null
          );
          setNameSubmitted(true);
          onNameSubmit?.(name.trim(), existingUserResponse.user.id);
        }
      } catch (error) {
        console.error('Error handling name submission:', error);
        // Still proceed with the UI flow even if API fails
        setNameSubmitted(true);
        onNameSubmit?.(name.trim());
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCharacterSubmit = async () => {
    if (selectedCharacter && !isLoading) {
      setIsLoading(true);
      try {
        const newUser = await createUser({
          name: name.trim(),
          character: selectedCharacter.slug,
        });
        console.log('Created new user:', newUser);

        setShowCharacterSelection(false);
        setNameSubmitted(true);
        onNameSubmit?.(name.trim(), newUser.user.id);
      } catch (error) {
        console.error('Error creating user:', error);
        // Still proceed with the UI flow even if API fails
        setShowCharacterSelection(false);
        setNameSubmitted(true);
        onNameSubmit?.(name.trim());
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center bg-cover bg-center text-center"
    >
      {!nameSubmitted && !showCharacterSelection ? (
        <form onSubmit={handleNameSubmit} className="flex w-md flex-col items-center gap-10">
          {/* Aspect ratio 3:4 */}
          <div className="flex flex-col items-center gap-1">
            <Image
              src="/bunny-sleep.png"
              alt="Bunny"
              height={150}
              width={200}
              className="object-contain"
            />
            <p className="text-fg1 font-abee-zee max-w-prose pt-3 text-2xl leading-6 font-medium">
              Talk to your friend
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's your name?"
              className="w-full rounded-4xl border border-gray-600 px-4 py-2 text-center focus:outline-none"
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="font-abee-zee w-full"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </Button>
          </div>
        </form>
      ) : showCharacterSelection ? (
        <div className="mt-6 w-md md:w-3xl">
          <p className="text-fg1 font-abee-zee mb-6 text-3xl">Hi {name}! Choose your friend:</p>
          <div className="mb-10 grid grid-cols-3 justify-center gap-4 md:grid-cols-5">
            {characters.map((character) => (
              <div key={character.slug} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setSelectedCharacter(character)}
                  className={`cursor-pointer rounded-4xl border-4 transition-colors ${
                    selectedCharacter?.slug === character.slug
                      ? 'border-teal-600 bg-transparent'
                      : 'border-transparent bg-transparent opacity-90 hover:border-gray-600 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={character.image}
                    alt={character.name}
                    width={80}
                    height={80}
                    className="h-full w-full rounded-[28px] object-cover p-1"
                  />
                </button>
                <p className="text-fg1 font-abee-zee text-sm">{character.name}</p>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCharacterSubmit}
            className="font-abee-zee w-fit"
            disabled={!selectedCharacter || isLoading}
          >
            {isLoading ? 'Choosing...' : 'Choose your friend'}
          </Button>
        </div>
      ) : (
        <div className="mt-6 w-64">
          <div className="flex flex-col items-center gap-2">
            {selectedCharacter && (
              <Image
                src={selectedCharacter?.image ?? ''}
                alt={selectedCharacter?.name ?? ''}
                height={150}
                width={200}
                className="h-full w-full rounded-[28px] object-contain p-1"
              />
            )}
            <p className="text-fg1 font-abee-zee mb-4 text-lg">Hello, {name}!</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={onStartCall}
            className="font-abee-zee w-full"
          >
            {startButtonText}
          </Button>
        </div>
      )}
    </div>
  );
};
