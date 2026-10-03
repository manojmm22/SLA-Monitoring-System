import { useEffect, useState } from 'react'
import {
  Box, Typography, Card, Avatar, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Alert, Switch, FormControlLabel, Tooltip, Grid,
  CircularProgress, Stack
} from '@mui/material'
import { Plus, Trash2, Edit, UserCheck, UserX, Shield, AlertTriangle, UserMinus } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const ROLES = ['Admin', 'Engineer', 'Viewer']

const defaultForm = {
  username: '', email: '', password: '', first_name: '', last_name: '', role: 'Viewer', is_active: true
}

export default function Users() {
  const { user: currentUser, logout } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [formData, setFormData] = useState({ ...defaultForm })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Delete Account Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/?per_page=100')
      setUsers(res.data.data || [])
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to load users list.')
    }
  }

  const openCreate = () => {
    setEditUser(null)
    setFormData({ ...defaultForm })
    setError('')
    setOpen(true)
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    const primaryRole = user.roles?.[0]?.name || 'Viewer'
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: primaryRole,
      is_active: user.is_active,
    })
    setError('')
    setOpen(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (editUser) {
        const payload: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        }
        if (formData.password) payload.password = formData.password
        await api.put(`/users/${editUser.id}`, payload)
        setSuccessMessage(`User @${editUser.username} updated successfully.`)
      } else {
        await api.post('/users/', formData)
        setSuccessMessage(`User @${formData.username} created successfully.`)
      }
      setOpen(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  // Open Delete Confirmation Modal
  const openDeleteDialog = (user: any) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
    setActionError('')
  }

  // Execute Account Deletion
  const confirmDeleteAccount = async () => {
    if (!userToDelete) return
    setDeleting(true)
    setActionError('')
    try {
      const isSelf = currentUser && (currentUser.id === userToDelete.id || currentUser.username === userToDelete.username)
      await api.delete(`/users/${userToDelete.id}`)
      setDeleteModalOpen(false)

      if (isSelf) {
        // If current user deleted their own account, log out immediately
        alert('Your account has been permanently deleted. Logging out...')
        logout()
        return
      }

      setSuccessMessage(`Account @${userToDelete.username} deleted successfully.`)
      setUserToDelete(null)
      fetchUsers()
    } catch (err: any) {
      setActionError(err.response?.data?.message || `Unable to delete account @${userToDelete.username}.`)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (user: any) => {
    setActionError('')
    try {
      await api.post(`/users/${user.id}/toggle-active`)
      setSuccessMessage(`User @${user.username} is now ${user.is_active ? 'Inactive' : 'Active'}.`)
      await fetchUsers()
    } catch (err: any) {
      setActionError(err.response?.data?.message || `Unable to update ${user.username}.`)
    }
  }

  const getRoleColor = (roleName: string) => {
    const m: Record<string, any> = { Admin: 'error', Engineer: 'warning', Viewer: 'info' }
    return m[roleName] || 'default'
  }

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
            Users & Account Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage team accounts, role assignments, profile status, and account deletions.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          {currentUser && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<UserMinus size={16} />}
              onClick={() => {
                const selfRecord = users.find(u => u.id === currentUser.id || u.username === currentUser.username) || currentUser
                openDeleteDialog(selfRecord)
              }}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Delete My Account
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={openCreate}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
            }}
          >
            Add User
          </Button>
        </Stack>
      </Box>

      {/* Notifications */}
      {actionError && (
        <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2, borderRadius: 2 }}>
          {actionError}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Users Table */}
      <Card sx={{ borderRadius: 2.5, bgcolor: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: { xs: 620, sm: 760 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(15, 23, 42, 0.6)' }}>
                <TableCell>User</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Last Login</TableCell>
                <TableCell align="right">Account Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isSelf = currentUser && (currentUser.id === user.id || currentUser.username === user.username)

                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          bgcolor: user.is_admin ? 'error.main' : 'primary.main',
                          width: 38, height: 38, fontSize: '0.9rem', fontWeight: 700
                        }}>
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight={700} variant="body2">{user.full_name}</Typography>
                            {isSelf && (
                              <Chip label="You" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {user.roles?.map((r: any) => (
                        <Chip key={r.id || r.name} label={r.name} size="small" color={getRoleColor(r.name)} sx={{ mr: 0.5, fontWeight: 600 }} />
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <Chip label="Viewer" size="small" color="default" sx={{ mr: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                        icon={user.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', px: { xs: 1, sm: 2 } }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Tooltip title="Edit user details">
                          <IconButton size="small" onClick={() => openEdit(user)}>
                            <Edit size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.is_active ? 'Deactivate user' : 'Activate user'}>
                          <IconButton size="small" onClick={() => handleToggle(user)}
                            color={user.is_active ? 'warning' : 'success'}>
                            {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={isSelf ? "Delete your account" : "Delete user account"}>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<Trash2 size={13} />}
                            onClick={() => openDeleteDialog(user)}
                            sx={{
                              fontSize: '0.72rem',
                              py: 0.3,
                              px: 1,
                              borderRadius: 1.5,
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              '&:hover': {
                                bgcolor: 'rgba(239, 68, 68, 0.15)',
                                borderColor: '#ef4444'
                              }
                            }}
                          >
                            Delete Account
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, bgcolor: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.3)' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={20} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Delete Account
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the account for:
          </Typography>
          {userToDelete && (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {userToDelete.full_name} (@{userToDelete.username})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userToDelete.email}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="caption">
              This action is permanent and cannot be undone. All roles, saved preferences, and individual reports will be deleted.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleting}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteAccount}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield size={20} />
            {editUser ? 'Edit User' : 'Create New User'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="First Name" value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Last Name" value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </Grid>
          </Grid>
          {!editUser && (
            <TextField
              fullWidth label="Username" value={formData.username} margin="normal"
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          )}
          <TextField
            fullWidth label="Email" type="email" value={formData.email} margin="normal"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <TextField
            fullWidth label={editUser ? "New Password (leave blank to keep)" : "Password"}
            type="password" value={formData.password} margin="normal"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editUser}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} label="Role">
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          {editUser && (
            <FormControlLabel
              control={
                <Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              }
              label="Active Account"
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          {editUser && (
            <Button
              color="error"
              variant="outlined"
              startIcon={<Trash2 size={15} />}
              onClick={() => {
                setOpen(false)
                openDeleteDialog(editUser)
              }}
            >
              Delete This Account
            </Button>
          )}
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Saving…' : editUser ? 'Update' : 'Create'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
