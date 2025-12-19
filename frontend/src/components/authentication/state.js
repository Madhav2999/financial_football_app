export const BASE_MODES = [
  { id: 'team', label: 'User Login' },
  { id: 'admin', label: 'Admin Login' },
  { id: 'moderator', label: 'Moderator Login' },
]

export const REGISTRATION_MODE = { id: 'register', label: 'Register Team' }

export const INITIAL_REGISTER_FORM = {
  loginId: '',
  teamName: '',
  organization: '',
  contactName: '',
  contactEmail: '',
  county: '',
  notes: '',
  password: '',
  coachContact:'',
  acknowledgements: {
    authorization: false,
    noGuarantee: false,
    travel: false,
  },
}

export const INITIAL_MODERATOR_REGISTER_FORM = {
  loginId: '',
  email: '',
  password: '',
  displayName: '',
}

export const INITIAL_FORGOT_STATE = {
  team: { contactEmail: '' },
  moderator: { email: '' },
}

export const REGISTRATION_VARIANTS = [
  { id: 'team', label: 'Team Registration', reset: INITIAL_REGISTER_FORM },
  { id: 'moderator', label: 'Moderator Registration', reset: INITIAL_MODERATOR_REGISTER_FORM },
]
