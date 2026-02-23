import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut } from 'lucide-react';

const UserProfile = () => {
  const { currentUser, logout, isOwner } = useAuth();

  if (!currentUser) return null;

  const { avatar_url, full_name, user_name } = currentUser.user_metadata || {};
  const displayName = full_name || user_name || currentUser.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-2 hover:bg-gray-800/50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-cyan-400/30">
          <Avatar className="h-8 w-8 border border-cyan-400 shadow-[0_0_8px_rgba(0,255,136,0.3)]">
            <AvatarImage src={avatar_url} alt={displayName} />
            <AvatarFallback>{displayName?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-300 hidden md:inline-block">
            {displayName} {isOwner && <span className="text-cyan-400 ml-1">✨</span>}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout} className="text-pink-500 focus:text-pink-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
