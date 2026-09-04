import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  updatePassword as updateFirebasePassword,
  sendPasswordResetEmail as sendFirebasePasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export interface RegisteredAccountSummary {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  nurseId?: number | null;
  phone?: string;
  createdAt?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | 'guest';
  isAdmin: boolean;
  isKaru: boolean;
  isNurse: boolean;
  canManageRoster: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    nurseId?: number | null,
    phone?: string
  ) => Promise<void>;
  signInWithGoogle: (preferredRole?: UserRole, isRegistering?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  changeAccountPassword: (newPassword: string) => Promise<void>;
  sendPasswordResetLink: (email: string) => Promise<void>;
  getAllRegisteredAccounts: () => Promise<RegisteredAccountSummary[]>;
  adminUpdateAccountRole: (email: string, newRole: UserRole) => Promise<void>;
  adminResetUserPassword: (email: string, newPassword: string) => Promise<void>;
  adminDeleteAccount: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LocalAccount {
  uid: string;
  email: string;
  password: string;
  profile: UserProfile;
}

const LOCAL_ACCOUNTS_KEY = 'hemo_registered_accounts_v1';

export const PERMANENT_ADMIN_EMAIL = 'emhaprojectart@gmail.com';
export const PERMANENT_ADMIN_PASSWORD = '5hni#5678MHA';

export const isPermanentAdminEmail = (rawEmail?: string | null): boolean => {
  if (!rawEmail) return false;
  const clean = rawEmail.trim().toLowerCase();
  return (
    clean === 'emhaprojectart@gmail.com' ||
    clean === 'emhaprojectart@gamil.com' ||
    clean === 'jumatlagipremium@gmail.com'
  );
};

export const encodeEmailKey = (email: string): string => {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

const getStoredAccounts = (): LocalAccount[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed: LocalAccount[] = JSON.parse(raw);
    // Filter out any legacy default/demo accounts
    const filtered = parsed.filter(
      (acc) =>
        !acc.uid.startsWith('local_karu_default') &&
        !acc.uid.startsWith('local_admin_default') &&
        !acc.uid.startsWith('local_nurse_default') &&
        !acc.uid.startsWith('demo_')
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
};

const saveStoredAccount = (acc: LocalAccount) => {
  try {
    const accounts = getStoredAccounts().filter(
      (a) => a.email.toLowerCase() !== acc.email.toLowerCase()
    );
    accounts.push(acc);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save local account to localStorage:', e);
  }
};

/**
 * Robust multi-strategy account finder:
 * Checks local storage, Firestore registered_accounts (by encoded key, raw email, or collection query),
 * and Firestore users collection.
 */
async function findAccountByAnyIdentifier(rawIdentifier: string): Promise<LocalAccount | null> {
  const cleanId = rawIdentifier.trim().toLowerCase();
  if (!cleanId) return null;

  // Check permanent administrator account
  if (cleanId === 'emhaprojectart@gmail.com' || cleanId === 'emhaprojectart@gamil.com') {
    return {
      uid: 'admin_emhaprojectart',
      email: 'emhaprojectart@gmail.com',
      password: PERMANENT_ADMIN_PASSWORD,
      profile: {
        uid: 'admin_emhaprojectart',
        email: 'emhaprojectart@gmail.com',
        displayName: 'Administrator Utama (MHA)',
        role: 'admin',
        nurseId: null,
        phone: '',
        photoURL: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const encoded = encodeEmailKey(cleanId);

  // 1. Check local storage
  const localAccounts = getStoredAccounts();
  const localMatched = localAccounts.find((a) => {
    const accEmail = a.email.toLowerCase();
    const accName = a.profile.displayName.toLowerCase();
    const accPhone = (a.profile.phone || '').replace(/[^0-9]/g, '');
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    return (
      accEmail === cleanId ||
      (cleanDigits.length >= 8 && accPhone === cleanDigits) ||
      (cleanId.length >= 3 && accName === cleanId)
    );
  });
  if (localMatched) return localMatched;

  // 2. Check Firestore registered_accounts with encoded key
  try {
    const regDoc = await getDoc(doc(db, 'registered_accounts', encoded));
    if (regDoc.exists()) {
      const d = regDoc.data();
      return {
        uid: d.uid || `user_${encoded}`,
        email: (d.email || cleanId).toLowerCase(),
        password: d.password || '',
        profile: {
          uid: d.uid || `user_${encoded}`,
          email: (d.email || cleanId).toLowerCase(),
          displayName: d.displayName || 'Staf HD',
          role: (d.role as UserRole) || 'nurse',
          nurseId: d.nurseId !== undefined ? d.nurseId : null,
          phone: d.phone || '',
          photoURL: d.photoURL || '',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn('Account lookup by encoded key note:', err);
  }

  // 3. Check Firestore registered_accounts with raw key (if email contains special characters)
  try {
    const regDocRaw = await getDoc(doc(db, 'registered_accounts', cleanId));
    if (regDocRaw.exists()) {
      const d = regDocRaw.data();
      return {
        uid: d.uid || regDocRaw.id,
        email: (d.email || cleanId).toLowerCase(),
        password: d.password || '',
        profile: {
          uid: d.uid || regDocRaw.id,
          email: (d.email || cleanId).toLowerCase(),
          displayName: d.displayName || 'Staf HD',
          role: (d.role as UserRole) || 'nurse',
          nurseId: d.nurseId !== undefined ? d.nurseId : null,
          phone: d.phone || '',
          photoURL: d.photoURL || '',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        },
      };
    }
  } catch {}

  // 4. Query collection registered_accounts (case-insensitive or by phone/displayName)
  try {
    const snap = await getDocs(collection(db, 'registered_accounts'));
    for (const d of snap.docs) {
      const data = d.data();
      const accEmail = (data.email || '').trim().toLowerCase();
      const accPhone = (data.phone || '').trim().replace(/[^0-9]/g, '');
      const accName = (data.displayName || '').trim().toLowerCase();
      const cleanPhone = cleanId.replace(/[^0-9]/g, '');

      if (
        accEmail === cleanId ||
        (cleanPhone.length >= 8 && accPhone === cleanPhone) ||
        (cleanId.length >= 3 && accName === cleanId)
      ) {
        return {
          uid: data.uid || d.id,
          email: accEmail || cleanId,
          password: data.password || '',
          profile: {
            uid: data.uid || d.id,
            email: accEmail || cleanId,
            displayName: data.displayName || 'Staf HD',
            role: (data.role as UserRole) || 'nurse',
            nurseId: data.nurseId !== undefined ? data.nurseId : null,
            phone: data.phone || '',
            photoURL: data.photoURL || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          },
        };
      }
    }
  } catch (err) {
    console.warn('registered_accounts scan note:', err);
  }

  // 5. Query collection users
  try {
    const userSnap = await getDocs(collection(db, 'users'));
    for (const d of userSnap.docs) {
      const data = d.data();
      const accEmail = (data.email || '').trim().toLowerCase();
      if (accEmail === cleanId) {
        return {
          uid: d.id,
          email: accEmail,
          password: '',
          profile: {
            uid: d.id,
            email: accEmail,
            displayName: data.displayName || 'Staf HD',
            role: (data.role as UserRole) || 'nurse',
            nurseId: data.nurseId !== undefined ? data.nurseId : null,
            phone: data.phone || '',
            photoURL: data.photoURL || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          },
        };
      }
    }
  } catch {}

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('hemo_user_profile_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear if it is a legacy default/demo account
        if (
          parsed?.uid?.startsWith('local_karu_default') ||
          parsed?.uid?.startsWith('local_admin_default') ||
          parsed?.uid?.startsWith('local_nurse_default') ||
          parsed?.uid?.startsWith('demo_')
        ) {
          localStorage.removeItem('hemo_user_profile_cache');
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile cache to localStorage
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('hemo_user_profile_cache', JSON.stringify(userProfile));
    } else {
      localStorage.removeItem('hemo_user_profile_cache');
    }
  }, [userProfile]);

  // Ensure permanent administrator account is seeded in localStorage and Firestore
  useEffect(() => {
    const permAccount: LocalAccount = {
      uid: 'admin_emhaprojectart',
      email: 'emhaprojectart@gmail.com',
      password: PERMANENT_ADMIN_PASSWORD,
      profile: {
        uid: 'admin_emhaprojectart',
        email: 'emhaprojectart@gmail.com',
        displayName: 'Administrator Utama (MHA)',
        role: 'admin',
        nurseId: null,
        phone: '',
        photoURL: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    };
    saveStoredAccount(permAccount);

    try {
      setDoc(
        doc(db, 'registered_accounts', encodeEmailKey('emhaprojectart@gmail.com')),
        {
          uid: 'admin_emhaprojectart',
          email: 'emhaprojectart@gmail.com',
          displayName: 'Administrator Utama (MHA)',
          role: 'admin',
          nurseId: null,
          password: PERMANENT_ADMIN_PASSWORD,
          phone: '',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        { merge: true }
      ).catch(() => {});
    } catch {}
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const prof = snap.data() as UserProfile;
            if (isPermanentAdminEmail(firebaseUser.email)) {
              prof.role = 'admin';
            }
            setUserProfile(prof);
          } else if (firebaseUser.email) {
            const cleanEmail = firebaseUser.email.toLowerCase();
            const found = await findAccountByAnyIdentifier(cleanEmail);
            const isPermAdmin = isPermanentAdminEmail(cleanEmail);
            const isKaru = cleanEmail.includes('karu');
            const isAdminEmail = cleanEmail.includes('admin') || cleanEmail.includes('sysadmin') || isPermAdmin;

            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: cleanEmail,
              displayName:
                found?.profile?.displayName ||
                firebaseUser.displayName ||
                (isPermAdmin ? 'Administrator (Utama)' : isKaru ? 'Kepala Ruangan (Karu)' : 'Staf HD'),
              role: isPermAdmin || isAdminEmail ? 'admin' : (found?.profile?.role || (isKaru ? 'karu' : 'nurse')),
              nurseId: found?.profile?.nurseId ?? null,
              phone: found?.profile?.phone || firebaseUser.phoneNumber || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: found?.profile?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, profile, { merge: true });
            setUserProfile(profile);
            saveStoredAccount({
              uid: firebaseUser.uid,
              email: cleanEmail,
              password: found?.password || '',
              profile,
            });
          }
        } catch (err) {
          console.warn('Could not load user profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (identifier: string, pass: string) => {
    setLoading(true);
    const cleanId = identifier.trim().toLowerCase();
    const isEmail = cleanId.includes('@');
    const isPermAdmin = isPermanentAdminEmail(cleanId);

    try {
      // 0. Explicit check for permanent administrator
      if (cleanId === 'emhaprojectart@gmail.com' || cleanId === 'emhaprojectart@gamil.com') {
        if (pass !== PERMANENT_ADMIN_PASSWORD) {
          throw new Error('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        }

        const adminProfile: UserProfile = {
          uid: 'admin_emhaprojectart',
          email: 'emhaprojectart@gmail.com',
          displayName: 'Administrator Utama (MHA)',
          role: 'admin',
          nurseId: null,
          phone: '',
          photoURL: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };

        setUserProfile(adminProfile);
        saveStoredAccount({
          uid: 'admin_emhaprojectart',
          email: 'emhaprojectart@gmail.com',
          password: PERMANENT_ADMIN_PASSWORD,
          profile: adminProfile,
        });

        try {
          setDoc(
            doc(db, 'registered_accounts', encodeEmailKey('emhaprojectart@gmail.com')),
            {
              uid: 'admin_emhaprojectart',
              email: 'emhaprojectart@gmail.com',
              displayName: 'Administrator Utama (MHA)',
              role: 'admin',
              nurseId: null,
              password: PERMANENT_ADMIN_PASSWORD,
              phone: '',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            { merge: true }
          ).catch(() => {});
          setDoc(doc(db, 'users', 'admin_emhaprojectart'), adminProfile, { merge: true }).catch(() => {});
        } catch {}

        return;
      }

      // 1. If it looks like an email, first try Firebase Auth
      let fbUser: User | null = null;

      if (isEmail) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanId, pass);
          fbUser = cred.user;
        } catch (err) {
          // Firebase Auth error - will fallback to our comprehensive Firestore & local check
          console.log('Firebase Auth direct attempt note:', err);
        }
      }

      // If Firebase Auth succeeded:
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const prof = snap.data() as UserProfile;
          if (isPermAdmin) {
            prof.role = 'admin';
          }
          setUserProfile(prof);
          saveStoredAccount({
            uid: fbUser.uid,
            email: cleanId,
            password: pass,
            profile: prof,
          });
          return;
        }

        // Look up registered_accounts or generate profile
        const found = await findAccountByAnyIdentifier(cleanId);
        const isKaruEmail = cleanId.includes('karu');
        const isAdminEmail = cleanId.includes('admin') || cleanId.includes('sysadmin') || isPermAdmin;
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: cleanId,
          displayName:
            found?.profile.displayName ||
            fbUser.displayName ||
            (isPermAdmin ? 'Administrator (Utama)' : isKaruEmail ? 'Kepala Ruangan (Karu)' : 'Staf HD'),
          role: isAdminEmail ? 'admin' : (found?.profile.role || (isKaruEmail ? 'karu' : 'nurse')),
          nurseId: found?.profile.nurseId ?? null,
          phone: found?.profile.phone || '',
          photoURL: fbUser.photoURL || '',
          createdAt: found?.profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, profile, { merge: true });
        setUserProfile(profile);
        saveStoredAccount({
          uid: fbUser.uid,
          email: cleanId,
          password: pass,
          profile,
        });
        return;
      }

      // 2. If Firebase Auth failed or identifier is not email format:
      // Search Firestore registered_accounts, users, and localStorage
      const foundAccount = await findAccountByAnyIdentifier(cleanId);

      if (!foundAccount) {
        throw new Error(
          `Akun "${cleanId}" belum terdaftar. Silakan periksa kembali email/ID Anda atau klik tab "Daftar Akun Baru" untuk mendaftar.`
        );
      }

      // If account has a stored password, verify it
      if (foundAccount.password && foundAccount.password !== pass) {
        throw new Error('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
      }

      // If Permanent Admin, ensure role is 'admin'
      if (isPermanentAdminEmail(foundAccount.email)) {
        foundAccount.profile.role = 'admin';
      }

      // Authenticate with the registered profile
      setUserProfile(foundAccount.profile);
      saveStoredAccount(foundAccount);

      // Attempt background sign up/in to Firebase Auth so future sessions stay synced
      if (foundAccount.email.includes('@')) {
        createUserWithEmailAndPassword(auth, foundAccount.email, pass)
          .catch(() => signInWithEmailAndPassword(auth, foundAccount.email, pass).catch(() => {}));
      }

      return;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    nurseId?: number | null,
    phone?: string
  ) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const encoded = encodeEmailKey(cleanEmail);
    const isPermAdmin = isPermanentAdminEmail(cleanEmail);

    // Registration of 'admin' role is restricted: only Kepala Ruangan and Perawat are allowed
    if (role === 'admin' && !isPermAdmin) {
      throw new Error(
        'Pendaftaran akun kategori Administrator dinonaktifkan. Pendaftaran hanya tersedia untuk kategori Kepala Ruang dan Perawat Pelaksana.'
      );
    }

    const finalRole: UserRole = isPermAdmin ? 'admin' : role;

    try {
      // 1. Check if email is already registered locally or in Firestore
      const existing = await findAccountByAnyIdentifier(cleanEmail);
      if (existing) {
        throw new Error('Email ini sudah terdaftar. Silakan beralih ke tab "Masuk Akun" untuk login.');
      }

      const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const profileData: UserProfile = {
        uid,
        email: cleanEmail,
        displayName: name,
        role: finalRole,
        nurseId: nurseId || null,
        phone: phone || '',
        photoURL: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to registered_accounts in Firestore
      try {
        await setDoc(doc(db, 'registered_accounts', encoded), {
          uid,
          email: cleanEmail,
          displayName: name,
          role: finalRole,
          nurseId: nurseId || null,
          password: pass,
          phone: phone || '',
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not save to firestore registered_accounts:', e);
      }

      // Save locally
      saveStoredAccount({
        uid,
        email: cleanEmail,
        password: pass,
        profile: profileData,
      });

      // Try Firebase Auth creation
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        await updateFirebaseProfile(cred.user, { displayName: name });
        profileData.uid = cred.user.uid;
        await setDoc(doc(db, 'users', cred.user.uid), profileData, { merge: true });
      } catch (fbErr) {
        console.warn('Firebase auth createUser note:', fbErr);
      }

      setUserProfile(profileData);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (preferredRole: UserRole = 'nurse', isRegistering: boolean = false) => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email?.trim().toLowerCase() || '';
      const encoded = encodeEmailKey(email);

      // Check if user has an existing account in Firestore or localStorage
      let existing = await findAccountByAnyIdentifier(email);

      // Also check Firestore users collection with cred.user.uid
      const userDocRef = doc(db, 'users', cred.user.uid);
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const uData = snap.data() as UserProfile;
          if (!existing) {
            existing = {
              uid: cred.user.uid,
              email: email,
              password: '',
              profile: uData,
            };
          }
        }
      } catch {}

      const isDevAdmin = email === 'jumatlagipremium@gmail.com';
      const isKaruEmail = email.includes('karu');
      const isAdminEmail = email.includes('admin') || email.includes('sysadmin') || isDevAdmin;

      let resolvedRole: UserRole = 'nurse';
      if (isDevAdmin || isAdminEmail) {
        resolvedRole = 'admin';
      } else if (existing?.profile?.role) {
        resolvedRole = existing.profile.role;
      } else if (isKaruEmail) {
        resolvedRole = 'karu';
      } else if (isRegistering) {
        resolvedRole = preferredRole;
      } else {
        resolvedRole = preferredRole || 'nurse';
      }

      const profileData: UserProfile = {
        uid: cred.user.uid,
        email: email,
        displayName:
          existing?.profile?.displayName ||
          cred.user.displayName ||
          (isDevAdmin
            ? 'Administrator (Developer)'
            : isKaruEmail
            ? 'Kepala Ruangan (Karu)'
            : 'Staf Hemodialisa'),
        role: resolvedRole,
        nurseId: existing?.profile?.nurseId ?? null,
        phone: existing?.profile?.phone || cred.user.phoneNumber || '',
        photoURL: cred.user.photoURL || '',
        createdAt: existing?.profile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(userDocRef, profileData, { merge: true });
      } catch (e) {
        console.warn('Could not save user profile doc:', e);
      }

      try {
        await setDoc(
          doc(db, 'registered_accounts', encoded),
          {
            uid: cred.user.uid,
            email: email,
            displayName: profileData.displayName,
            role: profileData.role,
            nurseId: profileData.nurseId,
            password: existing?.password || '',
            phone: profileData.phone,
            createdAt: profileData.createdAt,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not sync to registered_accounts:', e);
      }

      saveStoredAccount({
        uid: cred.user.uid,
        email: email,
        password: existing?.password || '',
        profile: profileData,
      });

      setUserProfile(profileData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      try {
        await signOut(auth);
      } catch {
        // Ignore signout error if using local auth
      }
      setUser(null);
      setUserProfile(null);
      localStorage.removeItem('hemo_user_profile_cache');
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    const currentUid = user?.uid || userProfile?.uid;
    const currentEmail = user?.email || userProfile?.email;
    if (!currentUid && !currentEmail) return;

    try {
      const updated: Partial<UserProfile> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // 1. If Firebase user exists and displayName changed, update Firebase Auth
      if (user && data.displayName) {
        try {
          await updateFirebaseProfile(user, { displayName: data.displayName });
        } catch (e) {
          console.warn('Could not update Firebase auth profile displayName:', e);
        }
      }

      // 2. Update Firestore users collection if user doc exists
      if (currentUid) {
        try {
          const userDocRef = doc(db, 'users', currentUid);
          await setDoc(userDocRef, updated, { merge: true });
        } catch (e) {
          console.warn('Could not update users doc in Firestore:', e);
        }
      }

      // 3. Update Firestore registered_accounts
      if (currentEmail) {
        try {
          const encoded = encodeEmailKey(currentEmail);
          const regDocRef = doc(db, 'registered_accounts', encoded);
          const regFields: Record<string, unknown> = {};
          if (data.displayName !== undefined) regFields.displayName = data.displayName;
          if (data.role !== undefined) regFields.role = data.role;
          if (data.nurseId !== undefined) regFields.nurseId = data.nurseId;
          if (data.phone !== undefined) regFields.phone = data.phone;
          if (Object.keys(regFields).length > 0) {
            await setDoc(regDocRef, regFields, { merge: true });
          }
        } catch (e) {
          console.warn('Could not update registered_accounts in Firestore:', e);
        }
      }

      // 4. Update localStorage accounts
      if (currentEmail) {
        const localAccounts = getStoredAccounts();
        const updatedAccounts = localAccounts.map((acc) => {
          if (acc.email.toLowerCase() === currentEmail.toLowerCase()) {
            return {
              ...acc,
              profile: {
                ...acc.profile,
                ...updated,
              },
            };
          }
          return acc;
        });
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      }

      // 5. Update in-memory userProfile and cache
      setUserProfile((prev) => {
        if (!prev) return null;
        const merged = { ...prev, ...updated };
        localStorage.setItem('hemo_user_profile_cache', JSON.stringify(merged));
        return merged;
      });
    } catch (err) {
      console.error('Error updating user profile:', err);
      throw err;
    }
  };

  const changeAccountPassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Kata sandi baru minimal harus 6 karakter.');
    }

    const currentEmail = user?.email || userProfile?.email;
    if (!currentEmail) {
      throw new Error('Tidak dapat menemukan informasi akun saat ini.');
    }

    // 1. Try Firebase Auth password change if logged in via Firebase
    let firebaseUpdated = false;
    if (user && user.email) {
      try {
        await updateFirebasePassword(user, newPassword);
        firebaseUpdated = true;
      } catch (fbErr: unknown) {
        const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
        if (msg.includes('requires-recent-login')) {
          throw new Error('Demi keamanan, silakan keluar (logout) dan masuk kembali sebelum mengganti kata sandi.');
        }
        // If operation not allowed or offline, proceed to sync Firestore/local
      }
    }

    // 2. Update in Firestore registered_accounts
    const encoded = encodeEmailKey(currentEmail);
    try {
      const regDocRef = doc(db, 'registered_accounts', encoded);
      await setDoc(regDocRef, { password: newPassword }, { merge: true });
    } catch (err) {
      console.warn('Could not update password in Firestore registered_accounts:', err);
    }

    // 3. Update in localStorage registered accounts
    const localAccounts = getStoredAccounts();
    const matchedIdx = localAccounts.findIndex((a) => a.email.toLowerCase() === currentEmail.toLowerCase());
    if (matchedIdx !== -1) {
      localAccounts[matchedIdx].password = newPassword;
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(localAccounts));
    }
  };

  const sendPasswordResetLink = async (emailToReset: string) => {
    const cleanEmail = emailToReset.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Harap masukkan alamat email.');
    }

    // Check if registered
    const encoded = encodeEmailKey(cleanEmail);
    let isRegistered = false;

    // Check local
    const localAccounts = getStoredAccounts();
    if (localAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      isRegistered = true;
    }

    // Check Firestore
    if (!isRegistered) {
      try {
        const snap = await getDoc(doc(db, 'registered_accounts', encoded));
        if (snap.exists()) {
          isRegistered = true;
        }
      } catch {}
    }

    if (!isRegistered) {
      throw new Error('Email tidak terdaftar di sistem HemoShift HD.');
    }

    // Send reset email via Firebase Auth if supported
    try {
      await sendFirebasePasswordResetEmail(auth, cleanEmail);
    } catch (fbErr: unknown) {
      console.warn('Firebase sendPasswordResetEmail note:', fbErr);
      // Even if Firebase auth email provider is restricted, give clear confirmation
    }
  };

  // Administrator Function: Get list of all registered accounts (from Firestore & LocalStorage)
  const getAllRegisteredAccounts = async (): Promise<RegisteredAccountSummary[]> => {
    const listMap = new Map<string, RegisteredAccountSummary>();

    // 1. Get from localStorage
    const local = getStoredAccounts();
    for (const acc of local) {
      listMap.set(acc.email.toLowerCase(), {
        uid: acc.uid,
        email: acc.email.toLowerCase(),
        displayName: acc.profile.displayName,
        role: acc.profile.role,
        nurseId: acc.profile.nurseId,
        phone: acc.profile.phone,
        createdAt: acc.profile.createdAt,
        password: acc.password,
      });
    }

    // 2. Get from Firestore collection registered_accounts
    try {
      const snap = await getDocs(collection(db, 'registered_accounts'));
      snap.forEach((d) => {
        const data = d.data();
        if (data.email) {
          const emailKey = data.email.toLowerCase();
          const existing = listMap.get(emailKey);
          listMap.set(emailKey, {
            uid: data.uid || d.id,
            email: emailKey,
            displayName: data.displayName || existing?.displayName || emailKey.split('@')[0],
            role: (data.role as UserRole) || existing?.role || 'nurse',
            nurseId: data.nurseId !== undefined ? data.nurseId : existing?.nurseId ?? null,
            phone: data.phone || existing?.phone || '',
            createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
            password: data.password || existing?.password || '',
          });
        }
      });
    } catch (err) {
      console.warn('Could not fetch registered_accounts from Firestore:', err);
    }

    // 3. Get from Firestore collection users (catches Google sign-ins and direct accounts)
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      userSnap.forEach((d) => {
        const data = d.data();
        if (data.email) {
          const emailKey = data.email.toLowerCase();
          const existing = listMap.get(emailKey);
          listMap.set(emailKey, {
            uid: data.uid || d.id,
            email: emailKey,
            displayName: data.displayName || existing?.displayName || emailKey.split('@')[0],
            role: (data.role as UserRole) || existing?.role || 'nurse',
            nurseId: data.nurseId !== undefined ? data.nurseId : existing?.nurseId ?? null,
            phone: data.phone || existing?.phone || '',
            createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
            password: existing?.password || '',
          });
        }
      });
    } catch (err) {
      console.warn('Could not fetch users from Firestore:', err);
    }

    // Ensure permanent administrator accounts are always included
    listMap.set('emhaprojectart@gmail.com', {
      uid: 'admin_emhaprojectart',
      email: 'emhaprojectart@gmail.com',
      displayName: 'Administrator Utama (MHA)',
      role: 'admin',
      nurseId: null,
      phone: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      password: '••••••••',
    });

    if (!listMap.has('jumatlagipremium@gmail.com')) {
      listMap.set('jumatlagipremium@gmail.com', {
        uid: 'admin_developer',
        email: 'jumatlagipremium@gmail.com',
        displayName: 'Administrator (Developer)',
        role: 'admin',
        nurseId: null,
        phone: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        password: '',
      });
    }

    return Array.from(listMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  // Administrator Function: Change user's role (admin, karu, or nurse)
  const adminUpdateAccountRole = async (emailToUpdate: string, newRole: UserRole) => {
    const cleanEmail = emailToUpdate.trim().toLowerCase();
    if (isPermanentAdminEmail(cleanEmail) && newRole !== 'admin') {
      throw new Error('Akun Administrator Tetap tidak dapat diubah perannya.');
    }
    const encoded = encodeEmailKey(cleanEmail);

    // 1. Update Firestore registered_accounts
    try {
      await setDoc(doc(db, 'registered_accounts', encoded), { role: newRole }, { merge: true });
    } catch (e) {
      console.warn('Firestore update role error:', e);
    }

    // 2. Update localStorage
    const local = getStoredAccounts();
    const matched = local.find((a) => a.email.toLowerCase() === cleanEmail);
    if (matched) {
      matched.profile.role = newRole;
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(local));
    }

    // 3. If the user being modified is currently logged in, update current userProfile state
    if (userProfile && userProfile.email.toLowerCase() === cleanEmail) {
      const updated = { ...userProfile, role: newRole };
      setUserProfile(updated);
      localStorage.setItem('hemo_user_profile_cache', JSON.stringify(updated));
    }
  };

  // Administrator Function: Directly reset user's password
  const adminResetUserPassword = async (emailToUpdate: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Kata sandi baru minimal 6 karakter.');
    }
    const cleanEmail = emailToUpdate.trim().toLowerCase();
    const encoded = encodeEmailKey(cleanEmail);

    // Update Firestore
    try {
      await setDoc(doc(db, 'registered_accounts', encoded), { password: newPassword }, { merge: true });
    } catch (e) {
      console.warn('Firestore update password error:', e);
    }

    // Update localStorage
    const local = getStoredAccounts();
    const matched = local.find((a) => a.email.toLowerCase() === cleanEmail);
    if (matched) {
      matched.password = newPassword;
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(local));
    }
  };

  // Administrator Function: Delete an account
  const adminDeleteAccount = async (emailToDelete: string) => {
    const cleanEmail = emailToDelete.trim().toLowerCase();
    if (isPermanentAdminEmail(cleanEmail)) {
      throw new Error('Akun Administrator Tetap dilindungi sistem dan tidak dapat dihapus.');
    }
    const encoded = encodeEmailKey(cleanEmail);

    // Delete from Firestore
    try {
      await deleteDoc(doc(db, 'registered_accounts', encoded));
    } catch (e) {
      console.warn('Firestore delete account error:', e);
    }

    // Delete from localStorage
    const local = getStoredAccounts();
    const filtered = local.filter((a) => a.email.toLowerCase() !== cleanEmail);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(filtered));
  };

  const activeEmail = (user?.email || userProfile?.email || '').trim().toLowerCase();
  const isPermAdmin = isPermanentAdminEmail(activeEmail);
  const currentRole: UserRole | 'guest' = isPermAdmin
    ? 'admin'
    : (userProfile?.role || (user ? 'nurse' : 'guest'));
  const isAdmin = currentRole === 'admin';
  const isKaru = currentRole === 'karu';
  const isNurse = currentRole === 'nurse';
  const canManageRoster = currentRole === 'admin' || currentRole === 'karu';
  const isAuthenticated = !!user || !!userProfile;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: currentRole,
        isAdmin,
        isKaru,
        isNurse,
        canManageRoster,
        isAuthenticated,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        updateUserProfileData,
        changeAccountPassword,
        sendPasswordResetLink,
        getAllRegisteredAccounts,
        adminUpdateAccountRole,
        adminResetUserPassword,
        adminDeleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
