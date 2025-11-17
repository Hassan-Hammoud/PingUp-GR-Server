import { Inngest } from 'inngest';
import User from './../models/User.js';

// Create a client to send and receive events
export const inngest = new Inngest({ id: 'pingup-app' });

// INNGEST FUNCTION TO SAVE USER DATA TO A DATABASE

const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-from-clerk' },
  { event: 'clerk/user.created' },
  async event => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;
      let username = email_addresses[0].email_address.split('@')[0];

      // CHECK AVAILABILITY OF USERNAME
      const user = await User.findOne({ username });

      if (user) {
        username = username + Math.floor(Math.random() * 10000);
      }

      const userData = {
        _id: id,
        email: email_addresses[0].email_address,
        full_name: first_name + ' ' + last_name,
        profile_picture: image_url,
        username,
      };

      const createdUser = await User.create(userData);
      console.log('User created successfully:', createdUser._id);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
);

// INNGEST FUNCTION TO UPDATE USER DATA TO A DATABASE

const syncUserUpdated = inngest.createFunction(
  { id: 'update-user-from-clerk' },
  { event: 'clerk/user.updated' },
  async event => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const updatedUserData = {
        email: email_addresses[0].email_address,
        full_name: first_name + ' ' + last_name,
        profile_picture: image_url,
      };

      const updatedUser = await User.findByIdAndUpdate(id, updatedUserData, {
        new: true,
      });
      console.log('User updated successfully:', updatedUser._id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
);

// INNGEST FUNCTION TO DELETE USER DATA FROM DATABASE

const syncUserDeleted = inngest.createFunction(
  { id: 'delete-user-with-clerk' },
  { event: 'clerk/user.deleted' },
  async event => {
    try {
      const { id } = event.data;

      const deletedUser = await User.findByIdAndDelete(id);
      console.log('User deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserUpdated, syncUserDeleted];
