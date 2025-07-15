import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { type UserCharacter, createSlug, createUser, getUserBySlug } from '@/lib/api';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
  onNameSubmit?: (name: string) => void;
}

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

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      setIsLoading(true);
      try {
        const slug = createSlug(name.trim());
        console.log('Generated slug:', slug);

        // Check if user exists
        const existingUser = await getUserBySlug(slug);

        if (!existingUser) {
          // User doesn't exist, create new user
          const newUser = await createUser({
            name: name.trim(),
            character: 'bunny' as UserCharacter, // Default character
          });
          console.log('Created new user:', newUser);
        } else {
          console.log('User already exists:', existingUser);
        }

        setNameSubmitted(true);
        onNameSubmit?.(name.trim());
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

  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center bg-cover bg-center text-center"
    >
      {/* Aspect ratio 3:4 */}
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

      {!nameSubmitted ? (
        <form onSubmit={handleNameSubmit} className="mt-6 w-64">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-center focus:outline-none"
            autoFocus
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="font-abee-zee w-full"
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? 'Creating...' : 'Continue'}
          </Button>
        </form>
      ) : (
        <div className="mt-6 w-64">
          <p className="text-fg1 font-abee-zee mb-4 text-lg">Hello, {name}!</p>
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
