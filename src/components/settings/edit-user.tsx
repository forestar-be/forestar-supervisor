'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { SSO_CONSOLE_URL } from '@/lib/session';
import { addUser, deleteUser, fetchUsers, updateUser } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import {
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ColumnDef,
} from '@forestar-be/ui';
import { ExternalLink, Plus, Trash2, Users } from 'lucide-react';

type Role =
  | 'OPERATOR'
  | 'SUPERVISOR'
  | 'ADMIN'
  | 'RENTAL_MANAGER'
  | 'RENTAL_OPERATOR'
  | 'INSTALLER'
  | 'FACTURATION';

interface User {
  id: string;
  username: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  OPERATOR: 'Opérateur',
  SUPERVISOR: 'Superviseur',
  ADMIN: 'Admin',
  RENTAL_MANAGER: 'Gestionnaire de location',
  RENTAL_OPERATOR: 'Opérateur de location',
  INSTALLER: 'Installateur',
  FACTURATION: 'Facturation',
};

const ROLE_OPTIONS: Role[] = [
  'OPERATOR',
  'SUPERVISOR',
  'RENTAL_MANAGER',
  'RENTAL_OPERATOR',
  'INSTALLER',
  'ADMIN',
  'FACTURATION',
];

/**
 * Utilisateurs — CRUD en mode historique (le mot de passe Forestar vit dans
 * la table `User` du serveur). En SSO, l'écran devient un miroir en lecture
 * seule : l'identité se gère dans Zitadel (AC-02), comme le faisait déjà
 * l'ancien `EditUser.tsx`.
 */
export default function EditUser() {
  const { token, ssoEnabled } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    if (!token) return;
    try {
      const result = await fetchUsers(token);
      setUsers(result);
    } catch {
      notifyError("Erreur lors du chargement des utilisateurs");
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchUsers(token)
      .then(setUsers)
      .catch(() => notifyError('Erreur lors du chargement des utilisateurs'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAdd = () => {
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    setRole('OPERATOR');
    setOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!token || !username.trim()) return;
    try {
      setSaving(true);
      if (selectedUser) {
        await updateUser(token, selectedUser.id, { username, password, role });
      } else {
        await addUser(token, { username, password, role });
      }
      notifySuccess('Utilisateur sauvegardé');
      setOpen(false);
      await reload();
    } catch {
      notifyError(
        "Une erreur s'est produite lors de la sauvegarde de l'utilisateur",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !toDelete) return;
    try {
      setDeleting(true);
      await deleteUser(token, toDelete.id);
      notifySuccess('Utilisateur supprimé');
      setToDelete(null);
      await reload();
    } catch {
      notifyError(
        "Une erreur s'est produite lors de la suppression de l'utilisateur",
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<User>[] = [
    { id: 'username', header: 'Utilisateur', accessorKey: 'username' },
    {
      id: 'role',
      header: 'Rôle',
      accessorKey: 'role',
      cell: ({ getValue }) => ROLE_LABELS[getValue() as Role] ?? getValue(),
    },
    ...(ssoEnabled
      ? []
      : [
          {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }: { row: { original: User } }) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleEdit(row.original);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  aria-label="Supprimer"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setToDelete(row.original);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ),
          } satisfies ColumnDef<User>,
        ]),
  ];

  return (
    <div className="space-y-4">
      {ssoEnabled ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Les comptes sont administrés dans Zitadel. Cette liste reflète les
            comptes hérités encore présents côté serveur et ne peut plus être
            modifiée ici.
          </p>
          <Button
            className="mt-3"
            render={
              <a href={SSO_CONSOLE_URL} target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
          >
            Ouvrir la console Zitadel
            <ExternalLink />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.length} utilisateur(s)
          </p>
          <Button size="sm" onClick={handleAdd}>
            <Plus />
            Ajouter un utilisateur
          </Button>
        </div>
      )}

      {!loading && users.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur" />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          getRowId={(row) => row.id}
          emptyMessage="Aucun utilisateur"
        />
      )}

      {!ssoEnabled && (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedUser ? 'Modifier' : 'Ajouter'} un utilisateur
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Nom d&apos;utilisateur</Label>
                  <Input
                    autoFocus
                    value={username}
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => v && setRole(v as Role)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(v: string) => ROLE_LABELS[v as Role] ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !username.trim() || (!selectedUser && !password)}
                >
                  Sauvegarder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={toDelete !== null}
            title="Supprimer l'utilisateur"
            message="Êtes-vous sûr de vouloir supprimer cet utilisateur ?"
            type="delete"
            confirmText="Supprimer"
            isLoading={deleting}
            onConfirm={handleDelete}
            onClose={() => setToDelete(null)}
          />
        </>
      )}
    </div>
  );
}
