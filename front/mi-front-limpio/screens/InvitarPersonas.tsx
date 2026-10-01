import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import {
  approvePendingJoinRequest,
  createInvitation,
  listPendingJoinRequests,
  rejectPendingJoinRequest,
  revokeInvitation,
  type Invitation,
  type PendingRole,
} from '../services/invitations';
import { useHousehold } from '../context/HouseholdContext';
import type { PrivateStackParamList } from '../navigation/types';
import type { JoinRequest } from '../services/api';

type Props = NativeStackScreenProps<PrivateStackParamList, 'P03InvitarPersonas'>;

const APPROVAL_ROLES: { id: PendingRole; label: string }[] = [
  { id: 'adult', label: 'Adult' },
  { id: 'adolescent', label: 'Adolescent' },
  { id: 'child', label: 'Child' },
  { id: 'senior', label: 'Senior' },
  { id: 'guest', label: 'Guest' },
];

const shortId = (value: string) => value.length > 8 ? `${value.slice(0, 8)}...` : value;

export const P03InvitarPersonas = ({ navigation, route }: Props) => {
  const { refreshMembers } = useHousehold();
  const { householdId } = route.params;

  const [activeInvitation, setActiveInvitation] = useState<Invitation | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [roleByRequest, setRoleByRequest] = useState<Record<string, PendingRole>>({});
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actingRequestId, setActingRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

const deepLink = activeInvitation
    ? `homeplus://join?token=${activeInvitation.token}`
    : null;

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    const { requests, error } = await listPendingJoinRequests(householdId);

    if (error) {
      setErrorMessage(error);
    } else {
      setJoinRequests(requests);
      setRoleByRequest((current) => {
        const next = { ...current };
        requests.forEach((request) => {
          if (!next[request.id]) next[request.id] = 'adult';
        });
        return next;
      });
    }

    setLoadingRequests(false);
  }, [householdId]);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const inviteExpiryLabel = useMemo(() => {
    if (!activeInvitation?.expires_at) return 'Link reusable';

    const diff = new Date(activeInvitation.expires_at).getTime() - Date.now();
    if (Number.isNaN(diff) || diff <= 0) return 'Sin vencimiento visible';

    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (hours > 0) return `Expira en ${hours}h ${minutes}m`;
    return `Expira en ${minutes} min`;
  }, [activeInvitation?.expires_at]);

  const handleGenerate = async () => {
    setLoadingCreate(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { invitation, error } = await createInvitation(householdId);

    if (error || !invitation) {
      setErrorMessage(error ?? 'No pudimos generar el enlace.');
    } else {
      setActiveInvitation(invitation);
      setSuccessMessage('Link reusable generado. Compartilo con las personas que quieras sumar.');
    }

    setLoadingCreate(false);
  };

  const handleShare = async () => {
    if (!deepLink) return;

    await Share.share({
      message: `Te invito a unirte a mi hogar en HomePlus. Abri este enlace: ${deepLink}`,
      title: 'Invitacion HomePlus',
    });
  };

  const handleRevoke = async (invitationId: string) => {
    Alert.alert('Revocar link', 'Este link dejara de aceptar nuevas solicitudes.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await revokeInvitation(householdId, invitationId);
          if (error) {
            Alert.alert('Error', error);
            return;
          }
          setActiveInvitation(null);
          setSuccessMessage('Link revocado.');
        },
      },
    ]);
  };

  const handleApprove = async (request: JoinRequest) => {
    const role = roleByRequest[request.id] ?? 'adult';
    setActingRequestId(request.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await approvePendingJoinRequest(householdId, request.id, role);

    if (error) {
      setErrorMessage(error);
    } else {
      setSuccessMessage('Solicitud aprobada.');
      await loadRequests();
      await refreshMembers();
    }

    setActingRequestId(null);
  };

  const handleReject = async (request: JoinRequest) => {
    setActingRequestId(request.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await rejectPendingJoinRequest(householdId, request.id);

    if (error) {
      setErrorMessage(error);
    } else {
      setSuccessMessage('Solicitud rechazada.');
      await loadRequests();
      await refreshMembers();
    }

    setActingRequestId(null);
  };

  const handleContinue = () => {
    navigation.replace('HomeTabs');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Invitar personas</Text>
        <Text style={styles.subtitle}>
          Genera un link reusable. Cada persona queda pendiente hasta que la apruebes.
        </Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

      <TouchableOpacity
        style={[styles.generateBtn, loadingCreate && styles.buttonDisabled]}
        onPress={() => void handleGenerate()}
        disabled={loadingCreate}
        accessibilityRole="button"
        accessibilityLabel="Generar link de invitacion"
      >
        {loadingCreate
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.generateBtnText}>Generar link reusable</Text>
        }
      </TouchableOpacity>

      {activeInvitation && deepLink && (
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Link listo</Text>
          <Text style={styles.qrSubtitle}>{inviteExpiryLabel}</Text>
          <View style={styles.qrContainer}>
            <QRCode value={deepLink} size={180} backgroundColor="#FFFFFF" color="#1C1C1C" />
          </View>
          <Text style={styles.tokenText} selectable>{deepLink}</Text>
          <View style={styles.qrActions}>
            <TouchableOpacity style={styles.shareBtn} onPress={() => void handleShare()}>
              <Text style={styles.shareBtnText}>Compartir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.revokeBtn} onPress={() => void handleRevoke(activeInvitation.id)}>
              <Text style={styles.revokeBtnText}>Revocar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Solicitudes pendientes</Text>
        <TouchableOpacity onPress={() => void loadRequests()} disabled={loadingRequests}>
          <Text style={styles.refreshText}>{loadingRequests ? 'Cargando...' : 'Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      {loadingRequests ? (
        <ActivityIndicator color="#E7643F" style={{ marginVertical: 16 }} />
      ) : joinRequests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
        </View>
      ) : (
        joinRequests.map((request) => {
          const selectedRole = roleByRequest[request.id] ?? 'adult';
          const acting = actingRequestId === request.id;

          return (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.requestTitle}>Persona {shortId(request.person_id)}</Text>
              <Text style={styles.requestMeta}>Membership {shortId(request.id)}</Text>

              <View style={styles.roleRow}>
                {APPROVAL_ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleChip, selectedRole === role.id && styles.roleChipActive]}
                    onPress={() => setRoleByRequest((current) => ({ ...current, [request.id]: role.id }))}
                    disabled={acting}
                  >
                    <Text style={[styles.roleChipText, selectedRole === role.id && styles.roleChipTextActive]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.approveBtn, acting && styles.buttonDisabled]}
                  onPress={() => void handleApprove(request)}
                  disabled={acting}
                >
                  <Text style={styles.approveBtnText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, acting && styles.buttonDisabled]}
                  onPress={() => void handleReject(request)}
                  disabled={acting}
                >
                  <Text style={styles.rejectBtnText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <TouchableOpacity style={styles.continueBtn} onPress={() => void handleContinue()}>
        <Text style={styles.continueBtnText}>Continuar al hogar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 24, paddingBottom: 48 },
  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1C', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B6B6B', lineHeight: 22 },
  errorText: { color: '#B6472C', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  successText: { color: '#2F6E4F', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B6B6B', letterSpacing: 0.5, textTransform: 'uppercase' },
  refreshText: { color: '#E7643F', fontSize: 13, fontWeight: '700' },
  generateBtn: {
    backgroundColor: '#E7643F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  generateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2DFD6',
  },
  qrTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1C', marginBottom: 4 },
  qrSubtitle: { fontSize: 13, color: '#E7643F', marginBottom: 20 },
  qrContainer: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16 },
  tokenText: { fontSize: 11, color: '#6B6B6B', textAlign: 'center', marginBottom: 20, paddingHorizontal: 8 },
  qrActions: { flexDirection: 'row', gap: 12 },
  shareBtn: { flex: 1, backgroundColor: '#E7643F', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  shareBtnText: { color: '#FFFFFF', fontWeight: '600' },
  revokeBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2DFD6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  revokeBtnText: { color: '#6B6B6B', fontWeight: '500' },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2DFD6' },
  emptyText: { color: '#6B6B6B', fontSize: 14, textAlign: 'center' },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2DFD6',
  },
  requestTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1C', marginBottom: 4 },
  requestMeta: { fontSize: 12, color: '#6B6B6B', marginBottom: 12 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  roleChip: { borderWidth: 1, borderColor: '#E2DFD6', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 10 },
  roleChipActive: { backgroundColor: '#FDF3EE', borderColor: '#E7643F' },
  roleChipText: { fontSize: 12, color: '#6B6B6B', fontWeight: '600' },
  roleChipTextActive: { color: '#E7643F' },
  requestActions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#2F6E4F', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approveBtnText: { color: '#FFFFFF', fontWeight: '700' },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: '#B6472C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText: { color: '#B6472C', fontWeight: '700' },
  continueBtn: {
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
