import { google } from 'googleapis';
import type { CalendarEvent } from '../shared/schema';

// Initialize OAuth2 client with credentials from environment
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost/oauth2callback'
);

// Set the refresh token (this will auto-refresh access tokens)
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * Fetch Google Calendar events for a specific date
 * @param date - Date string in format "YYYY-MM-DD"
 * @returns Array of CalendarEvent objects
 */
export async function getCalendarEvents(date: string): Promise<CalendarEvent[]> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Set time range for the entire day
    const startOfDay = new Date(date + 'T00:00:00');
    const endOfDay = new Date(date + 'T23:59:59');

    console.log(`Fetching calendar events for ${date}`);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`Found ${events.length} events for ${date}`);

    // Transform Google Calendar events to our CalendarEvent schema
    return events.map(event => ({
      id: event.id || '',
      title: event.summary || 'Untitled Event',
      startTime: event.start?.dateTime || event.start?.date || '',
      endTime: event.end?.dateTime || event.end?.date || '',
      isAllDay: !event.start?.dateTime, // All-day events don't have dateTime
      source: 'google',
    }));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    // Return empty array on error (graceful fallback)
    return [];
  }
}
