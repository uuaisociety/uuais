/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


const { defineSecret } = require("firebase-functions/params");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const sgMail = require('@sendgrid/mail');
const { time } = require("console");

admin.initializeApp();

// sgMail.setDataResidency('eu'); 
// uncomment the above line if you are sending mail using a regional EU subuser


// Confirmation email when a user registers to an event
exports.sendConfirmationEmail = functions.firestore
  .onDocumentCreated(
    {
    document: "registrations/{id}", 
    secrets: [SENDGRID_API_KEY],
    }, 
    async (event) => {
      // Initialize SendGrid with the API key from secrets
      const apiKey = SENDGRID_API_KEY.value();
      if (!apiKey) {
        throw new Error("SendGrid API key missing");
      }
      sgMail.setApiKey(apiKey);

      // Get registration data from the created document
      const data = event.data.data();
      const db = admin.firestore();

    // Fetch the event document using eventId from the registration
    const eventDoc = await db.collection("events").doc(data.eventId).get();

    if (!eventDoc.exists) {
      console.error(`Event not found for id ${data.eventId}`);
      return;
    }

    const eventData = eventDoc.data();

    // Format event date and time
    const eventStart = new Date(eventData.eventStartAt);

    const formattedDate = eventStart.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedTime = eventStart.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    });

    // Prepare email content using SendGrid dynamic template
    const msg = {
      to: data.userEmail,
      from: "no-reply@uuais.com", // Must be a verified sender in SendGrid
      templateId: "d-74fd2f0203ec4622a224e54a5f560688", // SendGrid dynamic template ID
      dynamicTemplateData: {
        name: data.userName,
        event_name: eventData.title,
        event_date: formattedDate,
        event_time: formattedTime,
        event_location: eventData.location,
      },
    };

    try {
      await sgMail.send(msg);
      console.log(`Email sent to ${data.userEmail}`);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  });


// Email asking for confirmation to attend an event
exports.sendAttendanceConfirmationEmail = onSchedule(
  {
    schedule: "every day 17:00", // At 17:00 UTC every day
    timezone: "Europe/Stockholm",
    secrets: [SENDGRID_API_KEY],
    timeoutSeconds: 300, // Allow extra time for sending multiple emails
  },
  async (event) => {
    // Initialize SendGrid with the API key from secrets
    const apiKey = SENDGRID_API_KEY.value();
    if (!apiKey) {
      throw new Error("SendGrid API key missing");
    }
    sgMail.setApiKey(apiKey);

    const db = admin.firestore();

    // Get today's date and calculate the date 2 days from now
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2);

    // Create range for the entire target day
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    console.log(`Searching for events between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    try {
      // Query events happening in the next 2 days
      const eventsSnapshot = await db
        .collection("events")
        .where("eventStartAt", ">=", startOfDay.toISOString())
        .where("eventStartAt", "<=", endOfDay.toISOString())
        .get();

      if (eventsSnapshot.empty) {
        console.log("No events found in the next 2 days.");
        return;
      }

      // Loop through each matching event
      const emailPromises = [];

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        // Format event date and time for the email
        const eventStart = new Date(eventData.eventStartAt);

        const formattedDate = eventStart.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const formattedTime = eventStart.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Stockholm",
        });

        // Get all registrations for this specific event
        const registrationsSnapshot = await db
          .collection("registrations")
          .where("eventId", "==", eventId)
          .where("status", "==", "invited")
          .get();

        if (registrationsSnapshot.empty) {
          console.log(`No registrations found for event: ${eventData.title} with status invited.`);
          continue;
        }

        // Prepare and send emails for this event
        registrationsSnapshot.forEach((regDoc) => {
          const regData = regDoc.data();

          const msg = {
            to: regData.userEmail,
            from: "no-reply@uuais.com",
            templateId: "d-5a5c84005216445eb3c19671d6237869",
            dynamicTemplateData: {
              name: regData.userName,
              event_name: eventData.title,
              event_date: formattedDate,
              event_time: formattedTime,
              event_location: eventData.location,
              event_id: eventId
            },
          };

          // Send the email and log the result
          const sendPromise = sgMail.send(msg)
            .then(() => console.log(`Reminder sent to ${regData.userEmail} for ${eventData.title}. \n User registered number ${registrationsSnapshot.docs.indexOf(regDoc) + 1} out of ${registrationsSnapshot.size} users.`))
            .catch((error) => console.error(`Failed to send reminder to ${regData.userEmail} for ${eventData.title}:`, error));

          // Save the "promise" (the tracking ticket) to ensure we wait for it later
          emailPromises.push(sendPromise);
        });
      }

      // Wait for all emails to be sent (or fail) before finishing the function
      await Promise.all(emailPromises);
      console.log(`Processed ${emailPromises.length} reminders.`);

    } catch (error) {
      console.error("Error in sendAttendanceConfirmationEmail function:", error);
    }
  }
);




// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started
// });
