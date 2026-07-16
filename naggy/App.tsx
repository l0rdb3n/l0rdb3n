import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { sampleItems } from './src/sampleData';
import { starterContacts } from './src/contacts';
import { Contact, ItemKind, SecretaryItem } from './src/types';

type Tab = 'Today' | 'Timeline' | 'Inbox' | 'More';
const kindMeta: Record<ItemKind, { icon: string; label: string; color: string }> = {
  task: { icon: '✓', label: 'Task', color: '#5068d9' },
  appointment: { icon: '▣', label: 'Appointment', color: '#9a56d3' },
  call: { icon: '☎', label: 'Call', color: '#178b78' },
  bill: { icon: '$', label: 'Bill', color: '#d77c26' },
  followUp: { icon: '↗', label: 'Follow-up', color: '#ba4f76' },
};

const dateText = (iso?: string) => iso ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : 'Any time';

export default function App() {
  const [tab, setTab] = useState<Tab>('Today');
  const [items, setItems] = useState(sampleItems);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ItemKind>('task');
  const [dueDate, setDueDate] = useState('2026-07-16');
  const [dueTime, setDueTime] = useState('');
  const [contactId, setContactId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [contacts, setContacts] = useState<Contact[]>(starterContacts);
  const [snoozeMinutes, setSnoozeMinutes] = useState(30);

  const openItems = useMemo(() => items.filter((item) => !item.completed), [items]);
  const priorityItem = openItems.find((item) => item.priority === 'high') ?? openItems[0];
  const todayItems = openItems.filter((item) => item.dueAt?.startsWith('2026-07-16'));

  const complete = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, completed: true } : item));
  const snooze = (id: string) => {
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
    setItems((current) => current.map((item) => item.id === id ? { ...item, dueAt: snoozedUntil, priority: 'high' } : item));
  };
  const addItem = () => {
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
    setItems((current) => [{ id: String(Date.now()), title: title.trim(), kind, dueAt: parsedDueAt?.toISOString(), contact: selectedContact?.name, phoneNumber: selectedContact?.phoneNumber, amount: kind === 'bill' && amount ? numericAmount : undefined, completed: false, priority: 'normal', source: 'manual' }, ...current]);
    setTitle('');
    setKind('task');
    setDueTime('');
    setContactId(undefined);
    setAmount('');
    setComposerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'Today' && <Today priorityItem={priorityItem} items={todayItems} allItems={openItems} onComplete={complete} onSnooze={snooze} snoozeMinutes={snoozeMinutes} />}
          {tab === 'Timeline' && <Timeline items={openItems} onComplete={complete} />}
          {tab === 'Inbox' && <Inbox />}
          {tab === 'More' && <More contacts={contacts} onAddContact={(contact) => setContacts((current) => [...current, contact])} snoozeMinutes={snoozeMinutes} setSnoozeMinutes={setSnoozeMinutes} />}
        </ScrollView>
        <View style={styles.nav}>
          {(['Today', 'Timeline', 'Inbox', 'More'] as Tab[]).map((name) => (
            <Pressable key={name} onPress={() => setTab(name)} style={styles.navItem}>
              <Text style={[styles.navIcon, tab === name && styles.navActive]}>{name === 'Today' ? '◉' : name === 'Timeline' ? '▤' : name === 'Inbox' ? '▱' : '•••'}</Text>
              <Text style={[styles.navText, tab === name && styles.navActive]}>{name}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityLabel="Add reminder" onPress={() => setComposerOpen(true)} style={styles.addButton}><Text style={styles.addText}>+</Text></Pressable>
        </View>
      </View>
      <Composer visible={composerOpen} title={title} kind={kind} dueDate={dueDate} dueTime={dueTime} amount={amount} contactId={contactId} contacts={contacts} setTitle={setTitle} setKind={setKind} setDueDate={setDueDate} setDueTime={setDueTime} setAmount={setAmount} setContactId={setContactId} onClose={() => setComposerOpen(false)} onSave={addItem} />
    </SafeAreaView>
  );
}

function Today({ priorityItem, items, allItems, onComplete, onSnooze, snoozeMinutes }: { priorityItem?: SecretaryItem; items: SecretaryItem[]; allItems: SecretaryItem[]; onComplete: (id: string) => void; onSnooze: (id: string) => void; snoozeMinutes: number }) {
  return <>
    <Text style={styles.eyebrow}>WEDNESDAY, JULY 16</Text><Text style={styles.heading}>Good morning.</Text>
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

function Timeline({ items, onComplete }: { items: SecretaryItem[]; onComplete: (id: string) => void }) {
  return <><Text style={styles.eyebrow}>YOUR DAY</Text><Text style={styles.heading}>Timeline</Text><Text style={styles.subheading}>Your appointments and commitments, in order.</Text>
    <Section title="WEDNESDAY, JULY 16" />
    {items.filter((item) => item.dueAt).sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')).map((item) => <View key={item.id} style={styles.timelineRow}><Text style={styles.time}>{dateText(item.dueAt)}</Text><View style={[styles.dot, { backgroundColor: kindMeta[item.kind].color }]} /><View style={styles.timelineItem}><ItemRow item={item} onComplete={onComplete} /></View></View>)}
    <Section title="UNSCHEDULED" />{items.filter((item) => !item.dueAt).map((item) => <ItemRow key={item.id} item={item} onComplete={onComplete} />)}
  </>;
}

function Inbox() { return <><Text style={styles.eyebrow}>CAPTURE</Text><Text style={styles.heading}>Inbox</Text><Text style={styles.subheading}>Things to sort into your day.</Text><View style={styles.empty}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Your inbox is clear</Text><Text style={styles.emptyCopy}>Future email and notification suggestions will appear here for your review before Naggy adds anything.</Text></View></>; }
function More({ contacts, onAddContact, snoozeMinutes, setSnoozeMinutes }: { contacts: Contact[]; onAddContact: (contact: Contact) => void; snoozeMinutes: number; setSnoozeMinutes: (minutes: number) => void }) {
  const [panel, setPanel] = useState<'reminders' | 'capture' | 'contacts' | undefined>();
  const [focusMode, setFocusMode] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const addContact = () => {
    if (!newName.trim()) return;
    onAddContact({ id: String(Date.now()), name: newName.trim(), phoneNumber: newPhone.trim() || undefined, email: newEmail.trim() || undefined });
    setNewName(''); setNewPhone(''); setNewEmail('');
  };
  return <><Text style={styles.eyebrow}>NAGGY</Text><Text style={styles.heading}>More</Text><Text style={styles.subheading}>Your secretary settings and tools.</Text>
    <Setting icon="◌" title="Reminder preferences" detail="Nudge timing, sounds, and focus mode" onPress={() => setPanel('reminders')} />
    <Setting icon="⇧" title="Capture connections" detail="Email and notification imports — coming later" onPress={() => setPanel('capture')} />
    <Setting icon="♙" title="Contacts" detail="People you call and follow up with" onPress={() => setPanel('contacts')} />
    {panel === 'reminders' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Reminder preferences</Text><Pressable onPress={() => setFocusMode(!focusMode)} style={styles.toggleRow}><Text style={styles.itemTitle}>Focus mode</Text><Text style={[styles.toggle, focusMode && styles.toggleOn]}>{focusMode ? 'ON' : 'OFF'}</Text></Pressable><Text style={styles.panelCopy}>When on, Naggy keeps your highest-priority unfinished item at the top of Today.</Text><Text style={styles.panelCopy}>Default snooze duration</Text><View style={styles.snoozeChoices}>{[10, 30, 60].map((minutes) => <Pressable key={minutes} onPress={() => setSnoozeMinutes(minutes)} style={[styles.kindChoice, snoozeMinutes === minutes && styles.kindSelected]}><Text style={snoozeMinutes === minutes ? styles.kindSelectedText : styles.kindChoiceText}>{minutes} min</Text></Pressable>)}</View></View>}
    {panel === 'capture' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Capture connections</Text><Text style={styles.panelCopy}>Email and phone-notification capture will be opt-in and review-first: Naggy will suggest an item in Inbox, never add it without your approval.</Text><Text style={styles.panelCopy}>This framework leaves the connection point ready, but it does not access email or notifications yet.</Text></View>}
    {panel === 'contacts' && <View style={styles.settingsPanel}><Text style={styles.panelTitle}>Contacts</Text>{contacts.map((contact) => <View key={contact.id} style={styles.contactRow}><View style={styles.contactCopy}><Text style={styles.itemTitle}>{contact.name}</Text><Text style={styles.itemDetail}>{contact.phoneNumber || contact.email || 'No details yet'}</Text></View>{contact.phoneNumber && <Pressable onPress={() => Linking.openURL(`tel:${contact.phoneNumber?.replace(/[^0-9+]/g, '')}`)} style={styles.contactAction}><Text style={styles.contactActionText}>Call</Text></Pressable>}{contact.email && <Pressable onPress={() => Linking.openURL(`mailto:${contact.email}`)} style={styles.contactAction}><Text style={styles.contactActionText}>Email</Text></Pressable>}{contact.website && <Pressable onPress={() => Linking.openURL(contact.website!)} style={styles.contactAction}><Text style={styles.contactActionText}>Web</Text></Pressable>}</View>)}<Text style={styles.addContactTitle}>ADD CONTACT</Text><TextInput value={newName} onChangeText={setNewName} placeholder="Name" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newPhone} onChangeText={setNewPhone} placeholder="Phone number (optional)" keyboardType="phone-pad" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><TextInput value={newEmail} onChangeText={setNewEmail} placeholder="Email (optional)" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#8b8b9a" style={styles.compactInput} /><Pressable onPress={addContact} style={styles.addContactButton}><Text style={styles.addContactText}>Save contact</Text></Pressable></View>}
  </>;
}
function Section({ title, action }: { title: string; action?: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.action}>{action}</Text>}</View>; }
function Stat({ label, value, color }: { label: string; value: string; color: string }) { return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Setting({ icon, title, detail, onPress }: { icon: string; title: string; detail: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.setting}><Text style={styles.settingIcon}>{icon}</Text><View style={styles.settingCopy}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemDetail}>{detail}</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }
function ItemRow({ item, onComplete }: { item: SecretaryItem; onComplete: (id: string) => void }) { const meta = kindMeta[item.kind]; return <View style={styles.item}><Pressable onPress={() => onComplete(item.id)} style={[styles.check, { borderColor: meta.color }]} /><View style={[styles.kindIcon, { backgroundColor: `${meta.color}18` }]}><Text style={{ color: meta.color, fontWeight: '800' }}>{meta.icon}</Text></View><View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemDetail}>{meta.label}{item.contact ? ` · ${item.contact}` : ''}{item.amount ? ` · $${item.amount.toFixed(2)}` : ''}</Text></View><Text style={styles.itemTime}>{dateText(item.dueAt)}</Text></View>; }
function Composer({ visible, title, kind, dueDate, dueTime, amount, contactId, contacts, setTitle, setKind, setDueDate, setDueTime, setAmount, setContactId, onClose, onSave }: { visible: boolean; title: string; kind: ItemKind; dueDate: string; dueTime: string; amount: string; contactId?: string; contacts: Contact[]; setTitle: (v: string) => void; setKind: (v: ItemKind) => void; setDueDate: (v: string) => void; setDueTime: (v: string) => void; setAmount: (v: string) => void; setContactId: (v?: string) => void; onClose: () => void; onSave: () => void }) { const needsContact = kind === 'call' || kind === 'followUp'; return <Modal visible={visible} transparent animationType="slide"><View style={styles.modalBackdrop}><ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Add to Naggy</Text><TextInput autoFocus value={title} onChangeText={setTitle} placeholder="What do you need to remember?" placeholderTextColor="#8b8b9a" style={styles.input} /><View style={styles.kindChoices}>{(Object.keys(kindMeta) as ItemKind[]).map((value) => <Pressable key={value} onPress={() => setKind(value)} style={[styles.kindChoice, kind === value && styles.kindSelected]}><Text style={kind === value ? styles.kindSelectedText : styles.kindChoiceText}>{kindMeta[value].label}</Text></Pressable>)}</View>{needsContact && <><Text style={styles.dueLabel}>CONTACT <Text style={styles.optional}>(optional)</Text></Text><View style={styles.kindChoices}>{contacts.map((contact) => <Pressable key={contact.id} onPress={() => setContactId(contact.id)} style={[styles.kindChoice, contactId === contact.id && styles.kindSelected]}><Text style={contactId === contact.id ? styles.kindSelectedText : styles.kindChoiceText}>{contact.name}</Text></Pressable>)}</View></>}{kind === 'bill' && <><Text style={styles.dueLabel}>BILL AMOUNT <Text style={styles.optional}>(optional)</Text></Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#8b8b9a" style={styles.compactInput} /></>}<Text style={styles.dueLabel}>DUE DATE & TIME <Text style={styles.optional}>(optional)</Text></Text><View style={styles.dueInputs}><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#8b8b9a" style={[styles.input, styles.dateInput]} /><TextInput value={dueTime} onChangeText={setDueTime} placeholder="14:30" keyboardType="numbers-and-punctuation" placeholderTextColor="#8b8b9a" style={[styles.input, styles.timeInput]} /></View><Text style={styles.hint}>Use 24-hour time. Leave time blank for an unscheduled item.</Text><Pressable onPress={onSave} style={styles.saveButton}><Text style={styles.saveText}>Add reminder</Text></Pressable><Pressable onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable></ScrollView></View></Modal>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf9f6' }, app: { flex: 1 }, content: { padding: 24, paddingBottom: 115 }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, color: '#777484', marginTop: 12 }, heading: { color: '#20202a', fontSize: 33, fontWeight: '800', marginTop: 6, letterSpacing: -1 }, subheading: { color: '#74727e', fontSize: 16, lineHeight: 23, marginTop: 6 }, nagCard: { backgroundColor: '#24253a', borderRadius: 22, padding: 21, marginTop: 26 }, nagLabel: { fontWeight: '800', color: '#b9c1ff', fontSize: 11, letterSpacing: 1.2 }, nagTitle: { color: 'white', fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 8 }, nagDetail: { color: '#c8c9d5', marginTop: 8, fontSize: 14 }, nagActions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 20 }, doneButton: { backgroundColor: '#d9ff75', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 }, doneText: { color: '#263000', fontWeight: '800' }, snoozeText: { color: '#e2e4ec', fontWeight: '700' }, section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 10 }, sectionTitle: { color: '#777484', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, action: { color: '#5068d9', fontWeight: '700', fontSize: 13 }, item: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 8, shadowColor: '#222', shadowOpacity: .035, shadowRadius: 8, elevation: 1 }, check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 11 }, kindIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, itemCopy: { flex: 1 }, itemTitle: { color: '#292833', fontWeight: '700', fontSize: 15 }, itemDetail: { color: '#83818d', marginTop: 3, fontSize: 12 }, itemTime: { color: '#5e5c68', fontSize: 12, marginLeft: 7 }, stats: { flexDirection: 'row', gap: 9 }, stat: { flex: 1, backgroundColor: '#fff', padding: 13, borderRadius: 15 }, statValue: { fontSize: 24, fontWeight: '800' }, statLabel: { fontSize: 12, color: '#777484', marginTop: 3 }, timelineRow: { flexDirection: 'row', alignItems: 'flex-start' }, time: { width: 62, fontSize: 12, color: '#74727e', paddingTop: 16 }, dot: { height: 10, width: 10, borderRadius: 5, marginTop: 18, marginRight: 9 }, timelineItem: { flex: 1 }, empty: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 31, marginTop: 28 }, emptyIcon: { fontSize: 26, color: '#5068d9' }, emptyTitle: { color: '#292833', fontWeight: '800', fontSize: 18, marginTop: 12 }, emptyCopy: { color: '#777484', textAlign: 'center', lineHeight: 20, marginTop: 8 }, setting: { flexDirection: 'row', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#e9e7e3', alignItems: 'center' }, settingCopy: { flex: 1 }, settingIcon: { color: '#5068d9', fontSize: 23, width: 25 }, chevron: { color: '#8b8994', fontSize: 28 }, settingsPanel: { marginTop: 17, padding: 17, backgroundColor: '#fff', borderRadius: 16 }, panelTitle: { color: '#292833', fontSize: 17, fontWeight: '800', marginBottom: 10 }, panelCopy: { color: '#74727e', fontSize: 13, lineHeight: 19, marginTop: 8 }, toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, toggle: { backgroundColor: '#ecebf0', color: '#777484', fontWeight: '800', fontSize: 11, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }, toggleOn: { backgroundColor: '#dce2ff', color: '#4056ba' }, snoozeChoices: { flexDirection: 'row', gap: 8, marginTop: 10 }, contactRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, paddingVertical: 11, borderBottomWidth: 1, borderColor: '#eeece9' }, contactCopy: { flexGrow: 1, minWidth: 130 }, contactAction: { backgroundColor: '#ecebf0', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, contactActionText: { color: '#4056ba', fontWeight: '800', fontSize: 11 }, addContactTitle: { color: '#777484', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginTop: 19 }, compactInput: { color: '#292833', fontSize: 15, backgroundColor: '#faf9f6', padding: 12, borderRadius: 10, marginTop: 8 }, addContactButton: { alignSelf: 'flex-start', backgroundColor: '#5068d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 11 }, addContactText: { color: '#fff', fontWeight: '800', fontSize: 13 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', height: 77, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eceae7' }, navItem: { alignItems: 'center', minWidth: 48 }, navIcon: { color: '#8b8994', fontSize: 17, height: 23 }, navText: { color: '#8b8994', fontSize: 10, marginTop: 1 }, navActive: { color: '#5068d9', fontWeight: '800' }, addButton: { width: 48, height: 48, backgroundColor: '#5068d9', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 3 }, addText: { color: '#fff', fontSize: 30, lineHeight: 33, fontWeight: '300' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,28,.3)' }, sheet: { maxHeight: '90%', backgroundColor: '#faf9f6', borderTopLeftRadius: 25, borderTopRightRadius: 25 }, sheetContent: { padding: 24, paddingBottom: 38 }, sheetHandle: { alignSelf: 'center', height: 4, width: 38, borderRadius: 2, backgroundColor: '#cfccd0', marginBottom: 20 }, sheetTitle: { fontSize: 23, fontWeight: '800', color: '#292833' }, input: { color: '#292833', fontSize: 17, backgroundColor: '#fff', padding: 15, borderRadius: 12, marginTop: 18 }, kindChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, kindChoice: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#ecebf0' }, kindSelected: { backgroundColor: '#dce2ff' }, kindChoiceText: { color: '#686673', fontSize: 13, fontWeight: '700' }, kindSelectedText: { color: '#4056ba', fontSize: 13, fontWeight: '800' }, dueLabel: { color: '#777484', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 20 }, optional: { fontWeight: '500', letterSpacing: 0 }, dueInputs: { flexDirection: 'row', gap: 8 }, dateInput: { flex: 3 }, timeInput: { flex: 2 }, hint: { color: '#83818d', fontSize: 11, marginTop: 7 }, saveButton: { backgroundColor: '#5068d9', padding: 15, borderRadius: 12, marginTop: 24, alignItems: 'center' }, saveText: { color: 'white', fontWeight: '800', fontSize: 16 }, cancelText: { textAlign: 'center', color: '#6f6d78', fontWeight: '700', paddingTop: 17 }
});
