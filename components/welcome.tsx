import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toastAlert } from '@/components/alert-toast';
import { Button } from '@/components/ui/button';
import { AuthData, authenticateUser, clearStoredAuthData, getStoredAuthData } from '@/lib/auth';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: () => void;
  onAuthSuccess?: (authData: AuthData) => void;
  isLoading?: boolean;
}

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  onAuthSuccess,
  isLoading: externalLoading = false,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for stored auth on component mount
  useEffect(() => {
    const storedAuth = getStoredAuthData();
    if (storedAuth) {
      setIsAuthenticated(true);
      setAuthData(storedAuth);
      onAuthSuccess?.(storedAuth);
    }
    setIsCheckingAuth(false);
  }, [onAuthSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim() && !isLoading) {
      setIsLoading(true);
      try {
        const newAuthData = await authenticateUser(email.trim(), password.trim());
        console.log('Authentication successful:', newAuthData);

        setIsAuthenticated(true);
        setAuthData(newAuthData);
        onAuthSuccess?.(newAuthData);
      } catch (error) {
        console.error('Login failed:', error);

        // Show error toast
        toastAlert({
          title: 'Login failed',
          description:
            error instanceof Error
              ? error.message
              : 'Please check your email and password and try again.',
        });

        // Clear the input fields
        setEmail('');
        setPassword('');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = () => {
    clearStoredAuthData();
    setIsAuthenticated(false);
    setAuthData(null);
    setEmail('');
    setPassword('');
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div
        ref={ref}
        inert={disabled}
        className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center bg-cover bg-center text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/bunny-sleep.png"
            alt="Bunny"
            height={150}
            width={200}
            className="object-contain"
          />
          <div className="border-t-primary h-8 w-8 animate-spin rounded-full border-4 border-gray-300"></div>
          <p className="text-fg1 font-abee-zee text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center bg-cover bg-center text-center"
    >
      {!isAuthenticated ? (
        <form onSubmit={handleLogin} className="flex w-md flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-1">
            <Image
              src="/bunny-sleep.png"
              alt="Bunny"
              height={150}
              width={200}
              className="object-contain"
            />
            <p className="text-fg1 font-abee-zee max-w-prose pt-3 text-2xl leading-6 font-medium">
              Sign in to talk to your friend
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-4xl border border-gray-600 px-4 py-2 text-center focus:outline-none"
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-4xl border border-gray-600 px-4 py-2 text-center focus:outline-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="font-abee-zee w-full"
              disabled={!email.trim() || !password.trim() || isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 w-64">
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/bunny-sleep.png"
              alt="Bunny"
              height={150}
              width={200}
              className="h-full w-full object-contain p-1"
            />
            <p className="text-fg1 font-abee-zee mb-4 text-lg">
              Welcome back, {authData?.user?.email}!
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartCall}
              className="font-abee-zee w-full"
              disabled={externalLoading}
            >
              {startButtonText}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="font-abee-zee w-full"
            >
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
