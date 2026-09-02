import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Contact, ItemKind, Recurrence, SecretaryItem } from './src/types';
import { supabase } from './src/supabase';

type Tab = 'Today' | 'Calendar' | 'Timeline' | 'Inbox' | 'More';
type InboxMessage = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: string;
  category: 'follow-up' | 'meeting' | 'bill';
};

const kindMeta: Record<ItemKind, { icon: string; label: string; color: string }> = {
  task: { icon: '✓', label: 'Task', color: '#5068d9' },
  appointment: { icon: '▣', label: 'Appointment', color: '#9a56d3' },
  call: { icon: '☎', label: 'Call', color: '#178b78' },
  bill: { icon: '$', label: 'Bill', color: '#d77c26' },
  followUp: { icon: '↗', label: 'Follow-up', color: '#ba4f76' },
};

const starterInboxMessages: InboxMessage[] = [
  { id: 'mail-1', sender: 'Ava @ Northstar', subject: 'Budget review for next week', preview: 'Can you review the revised budget before Friday?', receivedAt: '8:15 AM', category: 'follow-up' },
  { id: 'mail-2', sender: 'Finance', subject: 'Invoice 4821 is due today', preview: 'Please confirm payment before the end of the day.', receivedAt: '9:40 AM', category: 'bill' },
  { id: 'mail-3', sender: 'Riley', subject: 'Design sync this afternoon', preview: 'Let’s align on the launch assets at 3 PM.', receivedAt: '11:20 AM', category: 'meeting' },
];

const dateText = (iso?: string) => iso ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : 'Any time';
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const dateLabel = (key: string) => new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${key}T12:00:00`));
const occursOnDay = (item: SecretaryItem, key: string) => {
  if (!item.dueAt) return false;
  const anchor = new Date(item.dueAt);
  const target = new Date(`${key}T12:00:00`);
  const recurrenceEnd = item.recurrenceEndsOn ? new Date(`${item.recurrenceEndsOn}T23:59:59`) : undefined;
  if (recurrenceEnd && target > recurrenceEnd) return false;
  if (item.recurrence === 'weekly') return target.getDay() === anchor.getDay() && target >= new Date(dayKey(anchor));
  if (item.recurrence === 'monthly') return target.getDate() === anchor.getDate() && target >= new Date(dayKey(anchor));
  return dayKey(anchor) === key;
};

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [items, setItems] = useState<SecretaryItem[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ItemKind>('task');
  const [dueDate, setDueDate] = useState(dayKey(new Date()));
  const [dueTime, setDueTime] = useState('');
  const [contactId, setContactId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>();
  const [recurrenceEndsOn, setRecurrenceEndsOn] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [snoozeMinutes, setSnoozeMinutes] = useState(30);
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [emailInboxConnected, setEmailInboxConnected] = useState(false);
  const [emailInboxAddress, setEmailInboxAddress] = useState('');
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>(starterInboxMessages);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [authBusy, setAuthBusy] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const openItems = useMemo(() => items.filter((item) => !item.completed), [items]);
  const priorityItem = openItems.find((item) => item.priority === 'high') ?? openItems[0];
  const todayItems = openItems.filter((item) => occursOnDay(item, dayKey(new Date())));

  const complete = async (id: string) => {
    const { error } = await supabase.from('secretary_items').update({ completed: true }).eq('id', id);
    if (error) { Alert.alert('Could not complete reminder', error.message); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, completed: true } : item));
  };
  const snooze = async (id: string) => {
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
    const { error } = await supabase.from('secretary_items').update({ due_at: snoozedUntil, priority: 'high' }).eq('id', id);
    if (error) { Alert.alert('Could not snooze reminder', error.message); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, dueAt: snoozedUntil, priority: 'high' } : item));
  };
  const suggestTaskFromEmail = (message: InboxMessage) => {
    const suggestedKind: ItemKind = message.category === 'bill' ? 'bill' : message.category === 'meeting' ? 'appointment' : 'followUp';
    const title = message.category === 'bill' ? `Pay ${message.subject}` : `Follow up: ${message.subject}`;
    setItems((current) => [{ id: String(Date.now()), title, kind: suggestedKind, dueAt: undefined, contact: message.sender, email: emailInboxAddress || undefined, completed: false, priority: message.category === 'bill' ? 'high' : 'normal', source: 'email' }, ...current]);
    setInboxMessages((current) => current.filter((entry) => entry.id !== message.id));
    setTab('Today');
  };
  const connectInbox = () => {
    const trimmedAddress = emailInboxAddress.trim();
    if (!trimmedAddress) {
      Alert.alert('Add an email address', 'Enter an address to connect your inbox.');
      return;
    }
    Alert.alert(
      'Email connection is not available yet',
      'This app can preview email-style suggestions locally, but it cannot currently connect to Gmail or read your inbox from the phone. We can keep the inbox flow open for a future connected version.',
    );
  };
  const disconnectInbox = () => {
    setEmailInboxConnected(false);
    setEmailInboxAddress('');
  };
  const loadWorkspace = async (ownerId: string) => {
    const [{ data: itemRows, error: itemsError }, { data: contactRows, error: contactsError }] = await Promise.all([
      supabase.from('secretary_items').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true }),
    ]);
    if (itemsError || contactsError) {
      setAuthError(itemsError?.message ?? contactsError?.message ?? 'Could not load your workspace.');
      return;
    }
    setItems((itemRows ?? []).map((row) => ({ id: row.id, title: row.title, kind: row.kind as ItemKind, dueAt: row.due_at ?? undefined, recurrence: row.recurrence as Recurrence | undefined, recurrenceEndsOn: row.recurrence_ends_on ?? undefined, completed: row.completed, priority: row.priority as SecretaryItem['priority'], source: 'manual' })));
    setContacts((contactRows ?? []).map((row) => ({ id: row.id, name: row.name, phoneNumber: row.phone_number ?? undefined, email: row.email ?? undefined, website: row.website ?? undefined })));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session));
      setUserId(session?.user.id);
      if (session) void loadWorkspace(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setUserId(session?.user.id);
      if (session) void loadWorkspace(session.user.id); else { setItems([]); setContacts([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Enter an email and password to continue.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    const credentials = { email: authEmail.trim(), password: authPassword };
    const { error } = isSigningUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);
    setAuthBusy(false);
    if (error) { setAuthError(error.message); return; }
    if (isSigningUp) setAuthError('Account created. Check your email to confirm it, then sign in.');
  };
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { Alert.alert('Could not sign out', error.message); return; }
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
  };
  const addItem = async () => {
    if (!title.trim()) return;
    const parsedDueAt = dueDate && dueTime ? new Date(`${dueDate}T${dueTime}:00`) : undefined;
    if (parsedDueAt && Number.isNaN(parsedDueAt.getTime())) {
      Alert.alert('Check the due time', 'Use a date like 2026-07-16 and a 24-hour time like 14:30.');
      return;
    }
    const selectedContact = contacts.find((contact) => contact.id === contactId);
    const numericAmount = Number(amount);
    if (kind === 'bill' && amount && (!Number.isFinite(numericAmount) || numericAmount < 0)) {
      Alert.alert('Check the bill amount', 'Enter a positive dollar amount, such as 86.42.');
      return;
    }
    if (recurrence && recurrenceEndsOn && Number.isNaN(new Date(`${recurrenceEndsOn}T12:00:00`).getTime())) {
      Alert.alert('Check the repeat end date', 'Use a date like 2026-07-31.');
      return;
    }
    if (recurrence && recurrenceEndsOn && dueDate && recurrenceEndsOn < dueDate) {
      Alert.alert('Check the repeat end date', 'The repeat end date must be on or after the due date.');
      return;
    }
    if (!userId) return;
    const newItem = { title: title.trim(), kind, due_at: parsedDueAt?.toISOString() ?? null, recurrence: recurrence ?? null, recurrence_ends_on: recurrence && recurrenceEndsOn ? recurrenceEndsOn : null, completed: false, priority: 'normal', owner_id: userId };
    const { data, error } = await supabase.from('secretary_items').insert(newItem).select().single();
    if (error) { Alert.alert('Could not save reminder', error.message); return; }
    setItems((current) => [{ id: data.id, title: data.title, kind: data.kind as ItemKind, dueAt: data.due_at ?? undefined, contact: selectedContact?.name, phoneNumber: selectedContact?.phoneNumber, email: selectedContact?.email, amount: kind === 'bill' && amount ? numericAmount : undefined, recurrence: data.recurrence as Recurrence | undefined, recurrenceEndsOn: data.recurrence_ends_on ?? undefined, completed: data.completed, priority: data.priority as SecretaryItem['priority'], source: 'manual' }, ...current]);
    setTitle('');
    setKind('task');
    setDueTime('');
    setContactId(undefined);
    setAmount('');
    setRecurrence(undefined);
    setRecurrenceEndsOn('');
    setComposerOpen(false);
  };
  const addContact = async (contact: Contact) => {
    if (!userId) return;
    const { data, error } = await supabase.from('contacts').insert({ owner_id: userId, name: contact.name, phone_number: contact.phoneNumber ?? null, email: contact.email ?? null, website: contact.website ?? null }).select().single();
    if (error) { Alert.alert('Could not save contact', error.message); return; }
    setContacts((current) => [...current, { ...contact, id: data.id }]);
  };
  const updateContact = async (contact: Contact) => {
    const { error } = await supabase.from('contacts').update({ name: contact.name, phone_number: contact.phoneNumber ?? null, email: contact.email ?? null, website: contact.website ?? null }).eq('id', contact.id);
    if (error) { Alert.alert('Could not update contact', error.message); return; }
    setContacts((current) => current.map((existing) => existing.id === contact.id ? contact : existing));
  };
  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) { Alert.alert('Could not delete contact', error.message); return; }
    setContacts((current) => current.filter((contact) => contact.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.authScreen}>
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Welcome to Naggy</Text>
            <Text style={styles.authSubtitle}>{isSigningUp ? 'Create an account for your assistant workspace.' : 'Sign in to continue to your assistant workspace.'}</Text>
            <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor="#8b8b9a" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Password" placeholderTextColor="#8b8b9a" secureTextEntry style={styles.input} />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <Pressable disabled={authBusy} onPress={handleLogin} style={styles.authButton}><Text style={styles.authButtonText}>{authBusy ? 'Please wait…' : isSigningUp ? 'Create account' : 'Sign in'}</Text></Pressable>
            <Pressable disabled={authBusy} onPress={() => { setIsSigningUp((value) => !value); setAuthError(''); }}><Text style={styles.authHint}>{isSigningUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}</Text></Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'Today' && <Today priorityItem={priorityItem} items={todayItems} allItems={openItems} onComplete={complete} onSnooze={snooze} snoozeMinutes={snoozeMinutes} />}
          {tab === 'Calendar' && <Calendar items={openItems} selectedDate={selectedDate} onSelectDate={setSelectedDate} onComplete={complete} />}
          {tab === 'Timeline' && <Timeline items={openItems} onComplete={complete} />}
          {tab === 'Inbox' && <Inbox connected={emailInboxConnected} emailAddress={emailInboxAddress} messages={inboxMessages} onSuggestTask={suggestTaskFromEmail} onConnectInbox={connectInbox} onDisconnectInbox={disconnectInbox} setEmailAddress={setEmailInboxAddress} />}
          {tab === 'More' && <More contacts={contacts} onAddContact={addContact} onUpdateContact={updateContact} onDeleteContact={deleteContact} snoozeMinutes={snoozeMinutes} setSnoozeMinutes={setSnoozeMinutes} emailInboxConnected={emailInboxConnected} emailInboxAddress={emailInboxAddress} setEmailInboxAddress={setEmailInboxAddress} onConnectInbox={connectInbox} onDisconnectInbox={disconnectInbox} onLogout={handleLogout} />}
        </ScrollView>
        <View style={styles.nav}>
          {(['Today', 'Calendar', 'Timeline', 'Inbox', 'More'] as Tab[]).map((name) => (
            <Pressable key={name} onPress={() => setTab(name)} style={styles.navItem}>
              <Text style={[styles.navIcon, tab === name && styles.navActive]}>{name === 'Today' ? '◉' : name === 'Calendar' ? '□' : name === 'Timeline' ? '▤' : name === 'Inbox' ? '▱' : '•••'}</Text>
              <Text style={[styles.navText, tab === name && styles.navActive]}>{name}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityLabel="Add reminder" onPress={() => setComposerOpen(true)} style={styles.addButton}><Text style={styles.addText}>+</Text></Pressable>
        </View>
      </View>
      <Composer visible={composerOpen} title={title} kind={kind} dueDate={dueDate} dueTime={dueTime} amount={amount} recurrence={recurrence} recurrenceEndsOn={recurrenceEndsOn} contactId={contactId} contacts={contacts} setTitle={setTitle} setKind={setKind} setDueDate={setDueDate} setDueTime={setDueTime} setAmount={setAmount} setRecurrence={setRecurrence} setRecurrenceEndsOn={setRecurrenceEndsOn} setContactId={setContactId} onClose={() => setComposerOpen(false)} onSave={addItem} />
    </SafeAreaView>
  );
}

function Today({ priorityItem, items, allItems, onComplete, onSnooze, snoozeMinutes }: { priorityItem?: SecretaryItem; items: SecretaryItem[]; allItems: SecretaryItem[]; onComplete: (id: string) => void; onSnooze: (id: string) => void; snoozeMinutes: number }) {
  const today = new Date();
  return <>
    <Text style={styles.eyebrow}>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(today).toUpperCase()}</Text><Text style={styles.heading}>Good morning.</Text>
    <Text style={styles.subheading}>Here’s what needs your attention.</Text>
    {priorityItem && <View style={styles.nagCard}>
      <Text style={styles.nagLabel}>NAGGY SAYS</Text><Text style={styles.nagTitle}>{priorityItem.title}</Text>
      <Text style={styles.nagDetail}>{kindMeta[priorityItem.kind].label} · {dateText(priorityItem.dueAt)}{priorityItem.contact ? ` · ${priorityItem.contact}` : ''}</Text>
      <View style={styles.nagActions}><Pressable onPress={() => onComplete(priorityItem.id)} style={styles.doneButton}><Text style={styles.doneText}>Mark done</Text></Pressable><Pressable onPress={() => onSnooze(priorityItem.id)}><Text style={styles.snoozeText}>Snooze {snoozeMinutes} min</Text></Pressable></View>
    </View>}
    <Section title="TODAY’S TIMELINE" action="View all" />
    {items.map((item) => <ItemRow key={item.id} item={item} onComplete={onComplete} />)}
    <Section title="AT A GLANCE" />
    <View style={styles.stats}><Stat label="Calls" value={String(allItems.filter((item) => item.kind === 'call').length)} color="#178b78" /><Stat label="Bills due" value={String(allItems.filter((item) => item.kind === 'bill').length)} color="#d77c26" /><Stat label="Follow-ups" value={String(allItems.filter((item) => item.kind === 'followUp').length)} color="#ba4f76" /></View>
  </>;
}

function Calendar({ items, selectedDate, onSelectDate, onComplete }: { items: SecretaryItem[]; selectedDate: string; onSelectDate: (date: string) => void; onComplete: (id: string) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, weekOffset + index));
  const selectedItems = items.filter((item) => occursOnDay(item, selectedDate)).sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
  const returnToToday = () => { setWeekOffset(0); setMonthCursor(new Date()); onSelectDate(dayKey(today)); };
  const monthDays = () => { const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1); const start = addDays(first, -first.getDay()); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); };
  const changePeriod = (direction: number) => view === 'week' ? setWeekOffset((offset) => offset + 7 * direction) : setMonthCursor((month) => new Date(month.getFullYear(), month.getMonth() + direction, 1));
  const dateButton = (day: Date, compact = false) => { const key = dayKey(day); const selected = key === selectedDate; const count = items.filter((item) => occursOnDay(item, key)).length; return <Pressable key={key} onPress={() => onSelectDate(key)} style={[compact ? styles.monthCell : styles.dayCell, selected && styles.daySelected, compact && day.getMonth() !== monthCursor.getMonth() && styles.outsideMonth]}>{!compact && <Text style={[styles.dayName, selected && styles.daySelectedText]}>{new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day).slice(0, 2)}</Text>}<Text style={[compact ? styles.monthNumber : styles.dayNumber, selected && styles.daySelectedText]}>{day.getDate()}</Text><View style={[styles.dayDot, count > 0 && styles.dayDotActive, selected && styles.dayDotSelected]}>{count > 0 && <Text style={styles.dayCount}>{count}</Text>}</View>{key === dayKey(today) && !selected && <View style={styles.todayMarker} />}</Pressable>; };
  return <><Text style={styles.eyebrow}>YOUR SCHEDULE</Text><Text style={styles.heading}>Calendar</Text><View style={styles.viewChoices}><Pressable onPress={() => setView('week')} style={[styles.kindChoice, view === 'week' && styles.kindSelected]}><Text style={view === 'week' ? styles.kindSelectedText : styles.kindChoiceText}>7 days</Text></Pressable><Pressable onPress={() => setView('month')} style={[styles.kindChoice, view === 'month' && styles.kindSelected]}><Text style={view === 'month' ? styles.kindSelectedText : styles.kindChoiceText}>Month</Text></Pressable></View><View style={styles.calendarToolbar}><Pressable onPress={() => changePeriod(-1)} style={styles.weekButton}><Text style={styles.weekButtonText}>‹</Text></Pressable><Pressable onPress={returnToToday}><Text style={styles.todayButton}>{view === 'month' ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(monthCursor) : 'Today'}</Text></Pressable><Pressable onPress={() => changePeriod(1)} style={styles.weekButton}><Text style={styles.weekButtonText}>›</Text></Pressable></View>{view === 'week' ? <View style={styles.dayStrip}>{days.map((day) => dateButton(day))}</View> : <><View style={styles.monthWeekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}${index}`} style={styles.monthWeekday}>{day}</Text>)}</View><View style={styles.monthGrid}>{monthDays().map((day) => dateButton(day, true))}</View></>}<Section title={dateLabel(selectedDate).toUpperCase()} />{selectedItems.length > 0 ? selectedItems.map((item) => <ItemRow key={item.id} item={item} onComplete={onComplete} />) : <View style={styles.calendarEmpty}><Text style={styles.emptyTitle}>Nothing scheduled</Text><Text style={styles.emptyCopy}>Enjoy the breathing room, or add a reminder for this day.</Text></View>}</>;
}

function Timeline({ items, onComplete }: { items: SecretaryItem[]; onComplete: (id: string) => void }) {
  return <><Text style={styles.eyebrow}>YOUR DAY</Text><Text style={styles.heading}>Timeline</Text><Text style={styles.subheading}>Your appointments and commitments, in order.</Text>
    <Section title="WEDNESDAY, JULY 16" />
    {items.filter((item) => item.dueAt).sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')).map((item) => <View key={item.id} style={styles.timelineRow}><Text style={styles.time}>{dateText(item.dueAt)}</Text><View style={[styles.dot, { backgroundColor: kindMeta[item.kind].color }]} /><View style={styles.timelineItem}><ItemRow item={item} onComplete={onComplete} /></View></View>)}
    <Section title="UNSCHEDULED" />{items.filter((item) => !item.dueAt).map((item) => <ItemRow key={item.id} item={item} onComplete={onComplete} />)}
  </>;
}

function Inbox({ connected, emailAddress, messages, onSuggestTask, onConnectInbox, onDisconnectInbox, setEmailAddress }: { connected: boolean; emailAddress: string; messages: InboxMessage[]; onSuggestTask: (message: InboxMessage) => void; onConnectInbox: () => void; onDisconnectInbox: () => void; setEmailAddress: (value: string) => void }) {
  return <><Text style={styles.eyebrow}>CAPTURE</Text><Text style={styles.heading}>Inbox</Text><Text style={styles.subheading}>Email messages that can become tasks.</Text>
    {!connected ? <View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Connect your inbox</Text><Text style={styles.emptyCopy}>Add an email address to review messages and turn them into tasks automatically.</Text><TextInput value={emailAddress} onChangeText={setEmailAddress} placeholder="you@example.com" placeholderTextColor="#8b8b9a" style={styles.input} /><Pressable onPress={onConnectInbox} style={styles.contactAction}><Text style={styles.contactActionText}>Connect inbox</Text></Pressable></View> : <View><View style={styles.contactCard}><View style={styles.contactCopy}><Text style={styles.itemTitle}>Connected inbox</Text><Text style={styles.itemDetail}>{emailAddress || 'Your inbox is live'}</Text></View><Pressable onPress={onDisconnectInbox} style={styles.deleteAction}><Text style={styles.deleteActionText}>Disconnect</Text></Pressable></View>{messages.map((message) => <View key={message.id} style={styles.contactCard}><View style={styles.contactCopy}><Text style={styles.itemTitle}>{message.subject}</Text><Text style={styles.itemDetail}>{message.sender} · {message.receivedAt}</Text><Text style={styles.panelCopy}>{message.preview}</Text></View><Pressable onPress={() => onSuggestTask(message)} style={styles.contactAction}><Text style={styles.contactActionText}>Suggest task</Text></Pressable></View>)}</View>}
  </>; }
function More({ contacts, onAddContact, onUpdateContact, onDeleteContact, snoozeMinutes, setSnoozeMinutes, emailInboxConnected, emailInboxAddress, setEmailInboxAddress, onConnectInbox, onDisconnectInbox, onLogout }: { contacts: Contact[]; onAddContact: (contact: Contact) => void; onUpdateContact: (contact: Contact) => void; onDeleteContact: (id: string) => void; snoozeMinutes: number; setSnoozeMinutes: (minutes: number) => void; emailInboxConnected: boolean; emailInboxAddress: string; setEmailInboxAddress: (value: string) => void; onConnectInbox: () => void; onDisconnectInbox: () => void; onLogout: () => void }) {
  const [panel, setPanel] = useState<'reminders' | 'capture' | 'contacts' | undefined>();
  const [focusMode, setFocusMode] = useState(true);
  const [expandedContactId, setExpandedContactId] = useState<string | undefined>();
  const [draftId, setDraftId] = useState<string | undefined>();
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOther, setNewOther] = useState('');
  const [extraItems, setExtraItems] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [customSnooze, setCustomSnooze] = useState('');
  const clearContactForm = () => { setDraftId(undefined); setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress(''); setNewOther(''); setExtraItems([]); };
  const saveContact = () => {
    if (!newName.trim()) return;
    const contact: Contact = { id: draftId ?? String(Date.now()), name: newName.trim(), phoneNumber: newPhone.trim() || undefined, email: newEmail.trim() || undefined, address: newAddress.trim() || undefined, other: newOther.trim() || undefined, extras: extraItems.filter((item) => item.label.trim() || item.value.trim()) };
    if (draftId) onUpdateContact(contact); else onAddContact(contact);
    clearContactForm();
    setExpandedContactId(contact.id);
    setPanel('contacts');
  };
  const editContact = (contact: Contact) => { setDraftId(contact.id); setNewName(contact.name); setNewPhone(contact.phoneNumber ?? ''); setNewEmail(contact.email ?? ''); setNewAddress(contact.address ?? ''); setNewOther(contact.other ?? ''); setExtraItems(contact.extras ?? []); };
  const addExtra = () => setExtraItems((items) => items.length < 5 ? [...items, { id: String(Date.now()), label: '', value: '' }] : items);
  const updateExtra = (id: string, key: 'label' | 'value', value: string) => setExtraItems((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  return <><Text style={styles.eyebrow}>NAGGY</Text><Text style={styles.heading}>More</Text><Text style={styles.subheading}>Your secretary settings and tools.</Text>
    <Setting icon="◌" title="Reminder preferences" detail="Nudge timing, sounds, and focus mode" onPress={() => setPanel('reminders')} />
    <Setting icon="⇧" title="Capture connections" detail="Email and notification imports — coming later" onPress={() => setPanel('capture')} />
    <Setting icon="♙" title="Contacts" detail="People you call and follow up with" onPress={() => setPanel('contacts')} />
    <Pressable onPress={onLogout} style={styles.contactAction}><Text style={styles.contactActionText}>Log out</Text></Pressable>
    {panel === 'reminders' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Reminder preferences</Text><Pressable onPress={() => setFocusMode(!focusMode)} style={styles.toggleRow}><Text style={styles.itemTitle}>Focus mode</Text><Text style={[styles.toggle, focusMode && styles.toggleOn]}>{focusMode ? 'ON' : 'OFF'}</Text></Pressable><Text style={styles.panelCopy}>When on, Naggy keeps your highest-priority unfinished item at the top of Today.</Text><Text style={styles.panelCopy}>Default snooze duration</Text><View style={styles.snoozeChoices}>{[10, 30, 60].map((minutes) => <Pressable key={minutes} onPress={() => setSnoozeMinutes(minutes)} style={[styles.kindChoice, snoozeMinutes === minutes && styles.kindSelected]}><Text style={snoozeMinutes === minutes ? styles.kindSelectedText : styles.kindChoiceText}>{minutes} min</Text></Pressable>)}</View><View style={styles.customSnooze}><TextInput value={customSnooze} onChangeText={setCustomSnooze} placeholder="Any minutes" keyboardType="number-pad" placeholderTextColor="#8b8b9a" style={styles.customSnoozeInput} /><Pressable onPress={() => { const minutes = Number(customSnooze); if (Number.isInteger(minutes) && minutes > 0) { setSnoozeMinutes(minutes); setCustomSnooze(''); } }} style={styles.contactAction}><Text style={styles.contactActionText}>Set</Text></Pressable></View></View>}
    {panel === 'capture' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Capture connections</Text><Text style={styles.panelCopy}>Connect an email inbox so Naggy can review incoming messages and suggest tasks from them.</Text><TextInput value={emailInboxAddress} onChangeText={setEmailInboxAddress} placeholder="you@example.com" placeholderTextColor="#8b8b9a" style={styles.input} />{emailInboxConnected ? <View style={styles.contactButtons}><Text style={styles.panelCopy}>Connected to {emailInboxAddress || 'your inbox'}</Text><Pressable onPress={onDisconnectInbox} style={styles.deleteAction}><Text style={styles.deleteActionText}>Disconnect</Text></Pressable></View> : <Pressable onPress={onConnectInbox} style={styles.contactAction}><Text style={styles.contactActionText}>Connect inbox</Text></Pressable>}</View>}
    {panel === 'contacts' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Contacts</Text>{contacts.map((contact) => <View key={contact.id} style={styles.contactCard}><Pressable onPress={() => setExpandedContactId((id) => id === contact.id ? undefined : contact.id)} style={styles.contactHeader}><View style={styles.contactCopy}><Text style={styles.itemTitle}>{contact.name}</Text><Text style={styles.itemDetail}>{contact.phoneNumber || contact.email || contact.address || 'No details yet'}</Text></View><Text style={styles.expandSymbol}>{expandedContactId === contact.id ? '−' : '+'}</Text></Pressable>{expandedContactId === contact.id && <View style={styles.contactDetails}>{contact.phoneNumber && <Text style={styles.panelCopy}>Phone: {contact.phoneNumber}</Text>}{contact.email && <Text style={styles.panelCopy}>Email: {contact.email}</Text>}{contact.address && <Text style={styles.panelCopy}>Address: {contact.address}</Text>}{contact.other && <Text style={styles.panelCopy}>Other: {contact.other}</Text>}{contact.extras?.map((item) => <Text key={item.id} style={styles.panelCopy}>{item.label || 'Extra'}: {item.value}</Text>)}</View>}<View style={styles.contactButtons}>{contact.phoneNumber && <Pressable onPress={() => Linking.openURL(`tel:${contact.phoneNumber?.replace(/[^0-9+]/g, '')}`)} style={styles.contactAction}><Text style={styles.contactActionText}>Call</Text></Pressable>}{contact.email && <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)} style={styles.contactAction}><Text style={styles.contactActionText}>Email</Text></Pressable>}<Pressable onPress={() => editContact(contact)} style={styles.contactAction}><Text style={styles.contactActionText}>Edit</Text></Pressable><Pressable onPress={() => { onDeleteContact(contact.id); if (expandedContactId === contact.id) setExpandedContactId(undefined); }} style={styles.deleteAction}><Text style={styles.deleteActionText}>Delete</Text></Pressable></View></View>)}<Text style={styles.addContactTitle}>{draftId ? 'EDIT CONTACT' : 'ADD CONTACT'}</Text><TextInput value={newName} onChangeText={setNewName} placeholder="Name" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newPhone} onChangeText={setNewPhone} placeholder="Phone number (optional)" keyboardType="phone-pad" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newEmail} onChangeText={setNewEmail} placeholder="Email (optional)" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newAddress} onChangeText={setNewAddress} placeholder="Address (optional)" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newOther} onChangeText={setNewOther} placeholder="Other notes (optional)" placeholderTextColor="#8b8b9a" style={styles.compactInput} />{extraItems.map((item, index) => <View key={item.id} style={styles.extraRow}><TextInput value={item.label} onChangeText={(value) => updateExtra(item.id, 'label', value)} placeholder={`Extra ${index + 1} label`} placeholderTextColor="#8b8b9a" style={styles.extraLabelInput} /><TextInput value={item.value} onChangeText={(value) => updateExtra(item.id, 'value', value)} placeholder="Value" placeholderTextColor="#8b8b9a" style={styles.extraValueInput} /><Pressable onPress={() => setExtraItems((items) => items.filter((extra) => extra.id !== item.id))} style={styles.removeExtra}><Text style={styles.removeExtraText}>×</Text></Pressable></View>)}{extraItems.length < 5 && <Pressable onPress={addExtra} style={styles.addExtra}><Text style={styles.addExtraText}>+ Add extra item</Text></Pressable>}<View style={styles.formActions}><Pressable onPress={saveContact} style={styles.addContactButton}><Text style={styles.addContactText}>{draftId ? 'Save changes' : 'Save contact'}</Text></Pressable>{draftId && <Pressable onPress={clearContactForm} style={styles.cancelEdit}><Text style={styles.cancelEditText}>Cancel</Text></Pressable>}</View></View>}
  </>;
}
function Section({ title, action }: { title: string; action?: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.action}>{action}</Text>}</View>; }
function Stat({ label, value, color }: { label: string; value: string; color: string }) { return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Setting({ icon, title, detail, onPress }: { icon: string; title: string; detail: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.setting}><Text style={styles.settingIcon}>{icon}</Text><View style={styles.settingCopy}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemDetail}>{detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }
function ItemRow({ item, onComplete }: { item: SecretaryItem; onComplete: (id: string) => void }) {
  const meta = kindMeta[item.kind];
  const contactAction = item.phoneNumber
    ? { label: `Call ${item.contact ?? ''}`.trim(), url: `tel:${item.phoneNumber.replace(/[^0-9+]/g, '')}` }
    : item.email
      ? { label: `Email ${item.contact ?? ''}`.trim(), url: `mailto:${item.email}` }
      : undefined;
  return <View style={styles.item}><Pressable onPress={() => onComplete(item.id)} style={[styles.check, { borderColor: meta.color }]} /><View style={[styles.kindIcon, { backgroundColor: `${meta.color}18` }]}><Text style={{ color: meta.color, fontWeight: '800' }}>{meta.icon}</Text></View><View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemDetail}>{meta.label}{item.contact ? ` · ${item.contact}` : ''}{item.amount ? ` · $${item.amount.toFixed(2)}` : ''}</Text>{contactAction && <Pressable onPress={() => Linking.openURL(contactAction.url)} style={styles.eventContactAction}><Text style={styles.eventContactText}>{contactAction.label}</Text></Pressable>}</View><Text style={styles.itemTime}>{dateText(item.dueAt)}</Text></View>;
}
function Composer({ visible, title, kind, dueDate, dueTime, amount, recurrence, recurrenceEndsOn, contactId, contacts, setTitle, setKind, setDueDate, setDueTime, setAmount, setRecurrence, setRecurrenceEndsOn, setContactId, onClose, onSave }: { visible: boolean; title: string; kind: ItemKind; dueDate: string; dueTime: string; amount: string; recurrence?: Recurrence; recurrenceEndsOn: string; contactId?: string; contacts: Contact[]; setTitle: (v: string) => void; setKind: (v: ItemKind) => void; setDueDate: (v: string) => void; setDueTime: (v: string) => void; setAmount: (v: string) => void; setRecurrence: (v?: Recurrence) => void; setRecurrenceEndsOn: (v: string) => void; setContactId: (v?: string) => void; onClose: () => void; onSave: () => void }) { const needsContact = kind === 'call' || kind === 'followUp'; return <Modal visible={visible} transparent animationType="slide"><View style={styles.modalBackdrop}><ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Add to Naggy</Text><TextInput autoFocus value={title} onChangeText={setTitle} placeholder="What do you need to remember?" placeholderTextColor="#8b8b9a" style={styles.input} /><View style={styles.kindChoices}>{(Object.keys(kindMeta) as ItemKind[]).map((value) => <Pressable key={value} onPress={() => setKind(value)} style={[styles.kindChoice, kind === value && styles.kindSelected]}><Text style={kind === value ? styles.kindSelectedText : styles.kindChoiceText}>{kindMeta[value].label}</Text></Pressable>)}</View>{needsContact && <><Text style={styles.dueLabel}>CONTACT <Text style={styles.optional}>(optional)</Text></Text><View style={styles.kindChoices}>{contacts.map((contact) => <Pressable key={contact.id} onPress={() => setContactId(contact.id)} style={[styles.kindChoice, contactId === contact.id && styles.kindSelected]}><Text style={contactId === contact.id ? styles.kindSelectedText : styles.kindChoiceText}>{contact.name}</Text></Pressable>)}</View></>}{kind === 'bill' && <><Text style={styles.dueLabel}>BILL AMOUNT <Text style={styles.optional}>(optional)</Text></Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#8b8b9a" style={styles.compactInput} /></>}<Text style={styles.dueLabel}>DUE DATE & TIME <Text style={styles.optional}>(optional)</Text></Text><View style={styles.dueInputs}><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#8b8b9a" style={[styles.input, styles.dateInput]} /><TextInput value={dueTime} onChangeText={setDueTime} placeholder="14:30" keyboardType="numbers-and-punctuation" placeholderTextColor="#8b8b9a" style={[styles.input, styles.timeInput]} /></View><Text style={styles.hint}>Use 24-hour time. Leave time blank for an unscheduled item.</Text><Text style={styles.dueLabel}>REPEAT</Text><View style={styles.kindChoices}>{([{ value: undefined, label: 'Does not repeat' }, { value: 'weekly' as Recurrence, label: 'Every week' }, { value: 'monthly' as Recurrence, label: 'Every month' }]).map((choice) => <Pressable key={choice.label} onPress={() => setRecurrence(choice.value)} style={[styles.kindChoice, recurrence === choice.value && styles.kindSelected]}><Text style={recurrence === choice.value ? styles.kindSelectedText : styles.kindChoiceText}>{choice.label}</Text></Pressable>)}</View>{recurrence && <><Text style={styles.dueLabel}>STOP REPEATING AFTER <Text style={styles.optional}>(optional)</Text></Text><TextInput value={recurrenceEndsOn} onChangeText={setRecurrenceEndsOn} placeholder="YYYY-MM-DD" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><Text style={styles.hint}>The final occurrence can be on this date.</Text></>}<Pressable onPress={onSave} style={styles.saveButton}><Text style={styles.saveText}>Add reminder</Text></Pressable><Pressable onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable></ScrollView></View></Modal>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f6' }, app: { flex: 1 }, content: { padding: 24, paddingBottom: 115 }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: '#777484', marginTop: 12 }, heading: { color: '#20202a', fontSize: 33, fontWeight: '800', marginTop: 6, letterSpacing: -1 }, subheading: { color: '#74727e', fontSize: 16, lineHeight: 23, marginTop: 6 }, nagCard: { backgroundColor: '#24253a', borderRadius: 22, padding: 21, marginTop: 26 }, nagLabel: { fontWeight: '800', color: '#b9c1ff', fontSize: 11, letterSpacing: 1.2 }, nagTitle: { color: 'white', fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 8 }, nagDetail: { color: '#c8c9d5', marginTop: 8, fontSize: 14 }, nagActions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 20 }, doneButton: { backgroundColor: '#d9ff75', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 }, doneText: { color: '#263000', fontWeight: '800' }, snoozeText: { color: '#e2e4ec', fontWeight: '700' }, section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 10 }, sectionTitle: { color: '#777484', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, action: { color: '#5068d9', fontWeight: '700', fontSize: 13 }, item: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 8, shadowColor: '#222', shadowOpacity: .035, shadowRadius: 8, elevation: 1 }, check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 11 }, kindIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, itemCopy: { flex: 1 }, itemTitle: { color: '#292833', fontWeight: '700', fontSize: 15 }, itemDetail: { color: '#83818d', marginTop: 3, fontSize: 12 }, itemTime: { color: '#5e5c68', fontSize: 12, marginLeft: 7 }, stats: { flexDirection: 'row', gap: 9 }, stat: { flex: 1, backgroundColor: '#fff', padding: 13, borderRadius: 15 }, statValue: { fontSize: 24, fontWeight: '800' }, statLabel: { fontSize: 12, color: '#777484', marginTop: 3 }, timelineRow: { flexDirection: 'row', alignItems: 'flex-start' }, time: { width: 62, fontSize: 12, color: '#74727e', paddingTop: 16 }, dot: { height: 10, width: 10, borderRadius: 5, marginTop: 18, marginRight: 9 }, timelineItem: { flex: 1 }, empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 31, marginTop: 28 }, emptyIcon: { fontSize: 26, color: '#5068d9' }, emptyTitle: { color: '#292833', fontWeight: '800', fontSize: 18, marginTop: 12 }, emptyCopy: { color: '#777484', textAlign: 'center', lineHeight: 20, marginTop: 8 }, setting: { flexDirection: 'row', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#e9e7e3', alignItems: 'center' }, settingCopy: { flex: 1 }, settingIcon: { color: '#5068d9', fontSize: 23, width: 25 }, chevron: { color: '#8b8994', fontSize: 28 }, settingsPanel: { marginTop: 17, padding: 17, backgroundColor: '#fff', borderRadius: 16 }, panelTitle: { color: '#292833', fontSize: 17, fontWeight: '800', marginBottom: 10 }, panelCopy: { color: '#74727e', fontSize: 13, lineHeight: 19, marginTop: 8 }, toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, toggle: { backgroundColor: '#ecebf0', color: '#777484', fontWeight: '800', fontSize: 11, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }, toggleOn: { backgroundColor: '#dce2ff', color: '#4056ba' }, snoozeChoices: { flexDirection: 'row', gap: 8, marginTop: 10 }, contactRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, paddingVertical: 11, borderBottomWidth: 1, borderColor: '#eeece9' }, contactCopy: { flexGrow: 1, minWidth: 130 }, contactAction: { backgroundColor: '#ecebf0', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, contactActionText: { color: '#4056ba', fontWeight: '800', fontSize: 11 }, addContactTitle: { color: '#777484', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginTop: 19 }, compactInput: { color: '#292833', fontSize: 15, backgroundColor: '#faf9f6', padding: 12, borderRadius: 10, marginTop: 8 }, addContactButton: { alignSelf: 'flex-start', backgroundColor: '#5068d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 11 }, addContactText: { color: '#fff', fontWeight: '800', fontSize: 13 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', height: 77, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eceae7' }, navItem: { alignItems: 'center', minWidth: 48 }, navIcon: { color: '#8b8994', fontSize: 17, height: 23 }, navText: { color: '#8b8994', fontSize: 10, marginTop: 1 }, navActive: { color: '#5068d9', fontWeight: '800' }, addButton: { width: 48, height: 48, backgroundColor: '#5068d9', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 3 }, addText: { color: '#fff', fontSize: 30, lineHeight: 33, fontWeight: '300' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,28,.3)' }, sheet: { maxHeight: '90%', backgroundColor: '#faf9f6', borderTopLeftRadius: 25, borderTopRightRadius: 25 }, sheetContent: { padding: 24, paddingBottom: 38 }, sheetHandle: { alignSelf: 'center', height: 4, width: 38, borderRadius: 2, backgroundColor: '#cfccd0', marginBottom: 20 }, sheetTitle: { fontSize: 23, fontWeight: '800', color: '#292833' }, input: { color: '#292833', fontSize: 17, backgroundColor: '#fff', padding: 15, borderRadius: 12, marginTop: 18 }, kindChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, kindChoice: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#ecebf0' }, kindSelected: { backgroundColor: '#dce2ff' }, kindChoiceText: { color: '#686673', fontSize: 13, fontWeight: '700' }, kindSelectedText: { color: '#4056ba', fontSize: 13, fontWeight: '800' }, dueLabel: { color: '#777484', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 20 }, optional: { fontWeight: '500', letterSpacing: 0 }, dueInputs: { flexDirection: 'row', gap: 8 }, dateInput: { flex: 3 }, timeInput: { flex: 2 }, hint: { color: '#83818d', fontSize: 11, marginTop: 7 }, saveButton: { backgroundColor: '#5068d9', padding: 15, borderRadius: 12, marginTop: 24, alignItems: 'center' }, saveText: { color: 'white', fontWeight: '800', fontSize: 16 }, cancelText: { textAlign: 'center', color: '#6f6d78', fontWeight: '700', paddingTop: 17 },
  authScreen: { flex: 1, justifyContent: 'center', padding: 24 },
  authCard: { backgroundColor: '#fff', borderRadius: 22, padding: 24, shadowColor: '#222', shadowOpacity: .06, shadowRadius: 14, elevation: 2 },
  authTitle: { color: '#20202a', fontSize: 29, fontWeight: '800' }, authSubtitle: { color: '#74727e', fontSize: 15, lineHeight: 22, marginTop: 8 }, authError: { color: '#c34242', fontSize: 13, fontWeight: '700', marginTop: 12 }, authButton: { backgroundColor: '#5068d9', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 }, authButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' }, authHint: { color: '#83818d', fontSize: 12, lineHeight: 18, marginTop: 16 },
  viewChoices: { flexDirection: 'row', gap: 8, marginTop: 17 }, calendarToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, weekButton: { backgroundColor: '#ecebf0', height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }, weekButtonText: { color: '#4056ba', fontSize: 27, lineHeight: 29 }, todayButton: { color: '#4056ba', fontWeight: '800', fontSize: 14 }, dayStrip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17 }, dayCell: { width: 42, height: 74, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  monthWeekdays: { flexDirection: 'row', marginTop: 16 }, monthWeekday: { width: '14.2857%', textAlign: 'center', color: '#8b8994', fontSize: 11, fontWeight: '800' }, monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, monthCell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, monthNumber: { color: '#292833', fontSize: 14, fontWeight: '700' }, outsideMonth: { opacity: .35 }, daySelected: { backgroundColor: '#5068d9' }, dayName: { color: '#777484', fontSize: 10, fontWeight: '800' }, dayNumber: { color: '#292833', fontSize: 17, fontWeight: '800', marginTop: 3 }, daySelectedText: { color: '#fff' }, dayDot: { height: 12, minWidth: 12, borderRadius: 6, marginTop: 4, alignItems: 'center', justifyContent: 'center' }, dayDotActive: { backgroundColor: '#dce2ff' }, dayDotSelected: { backgroundColor: '#d9ff75' }, dayCount: { fontSize: 8, color: '#4056ba', fontWeight: '800' }, todayMarker: { height: 3, width: 3, borderRadius: 2, backgroundColor: '#5068d9', marginTop: 7 }, calendarEmpty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 25, marginTop: 3 },
  eventContactAction: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#e7ecff', borderRadius: 8 }, eventContactText: { color: '#4056ba', fontSize: 11, fontWeight: '800' }, contactCard: { borderBottomWidth: 1, borderColor: '#eeece9', paddingVertical: 11 }, contactHeader: { flexDirection: 'row', alignItems: 'center' }, contactDetails: { paddingTop: 3, paddingBottom: 8 }, contactButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 }, expandSymbol: { color: '#4056ba', fontSize: 22, fontWeight: '500' }, deleteAction: { backgroundColor: '#fff0f0', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, deleteActionText: { color: '#c34242', fontSize: 11, fontWeight: '800' },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }, extraLabelInput: { flex: 1, color: '#292833', fontSize: 13, backgroundColor: '#faf9f6', padding: 10, borderRadius: 9 }, extraValueInput: { flex: 1, color: '#292833', fontSize: 13, backgroundColor: '#faf9f6', padding: 10, borderRadius: 9 }, removeExtra: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f0', borderRadius: 8 }, removeExtraText: { color: '#c34242', fontSize: 19 }, addExtra: { alignSelf: 'flex-start', marginTop: 11, paddingVertical: 6 }, addExtraText: { color: '#4056ba', fontSize: 13, fontWeight: '800' }, formActions: { flexDirection: 'row', alignItems: 'center', gap: 15 }, cancelEdit: { marginTop: 11, paddingVertical: 10 }, cancelEditText: { color: '#6f6d78', fontSize: 13, fontWeight: '800' }, customSnooze: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, customSnoozeInput: { flex: 1, color: '#292833', fontSize: 14, backgroundColor: '#faf9f6', padding: 10, borderRadius: 9 }
});
