"use client";
import React from "react";

export default function PrivacyPage(): JSX.Element {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="prose prose-invert max-w-none">
        <h1 className="text-3xl font-bold mb-8 text-[var(--fg)]">Privacy Policy</h1>
        
        <div className="space-y-8">
          <section>
            <p className="text-lg text-[var(--fg)]/80 leading-relaxed">
              At Pet Portrait Studio, we understand that your beloved pets are family, and we're committed to protecting both your privacy and the precious memories you share with us. This privacy policy explains how we collect, use, and safeguard your information when you create beautiful portraits of your furry, feathered, or scaled companions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 text-[var(--fg)]">Photos of Your Beloved Pets</h3>
            <p className="mb-4 text-[var(--fg)]/80">
              When you upload photos of your pets, we temporarily store them to create your custom portraits. These images are processed using AI technology to transform them into beautiful artistic representations. We understand these photos capture precious moments with your companions, and we treat them with the utmost care and respect.
            </p>

            <h3 className="text-xl font-medium mb-3 text-[var(--fg)]">Account Information</h3>
            <p className="mb-4 text-[var(--fg)]/80">
              When you sign up, we collect your email address and basic profile information through secure OAuth providers (Google, Facebook, LinkedIn, or Twitter). This helps us create your account and provide you with a personalized experience.
            </p>

            <h3 className="text-xl font-medium mb-3 text-[var(--fg)]">Usage Information</h3>
            <p className="mb-4 text-[var(--fg)]/80">
              We track how you use our service to improve your experience, including which features you use most and how many portraits you create. This helps us make the service better for you and other pet lovers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">How We Use Your Information</h2>
            
            <ul className="space-y-3 text-[var(--fg)]/80">
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Creating Your Pet Portraits:</strong> We use your pet photos to generate the beautiful artistic portraits you request. This is the heart of our service - transforming your memories into lasting art.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Account Management:</strong> We use your account information to manage your profile, track your credits, and provide customer support when you need help.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Service Improvement:</strong> We analyze usage patterns to make our AI better at creating portraits that capture the unique personality of each pet.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Communication:</strong> We may send you updates about new features, special offers, or important service changes that affect your experience.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Data Storage and Security</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              We use industry-standard security measures to protect your information and your precious pet photos. Your data is stored securely using Supabase, a trusted cloud platform that meets strict security standards.
            </p>

            <h3 className="text-xl font-medium mb-3 text-[var(--fg)]">Photo Retention</h3>
            <p className="mb-4 text-[var(--fg)]/80">
              Your original pet photos are automatically deleted from our servers after processing is complete. We only keep the generated portraits in your account so you can access them anytime. This ensures your original photos remain private while preserving the beautiful art we create together.
            </p>

            <h3 className="text-xl font-medium mb-3 text-[var(--fg)]">Secure Processing</h3>
            <p className="mb-4 text-[var(--fg)]/80">
              All image processing happens through secure, encrypted connections. We use Replicate's AI services, which are designed with privacy and security in mind, ensuring your pet's photos are handled with the same care we'd want for our own beloved companions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Sharing Your Information</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              We never sell your personal information or your pet photos to third parties. Your privacy and the privacy of your beloved pets is sacred to us.
            </p>

            <p className="mb-4 text-[var(--fg)]/80">
              We may share information only in these limited circumstances:
            </p>

            <ul className="space-y-3 text-[var(--fg)]/80">
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>With Your Consent:</strong> If you choose to share your portraits on our community feed, we'll display them as you've requested.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Service Providers:</strong> We work with trusted partners like Supabase and Replicate to provide our services, but they're bound by strict privacy agreements.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Legal Requirements:</strong> We may disclose information if required by law, but we'll always protect your privacy to the fullest extent possible.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Your Rights and Choices</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              You have control over your information and your pet's photos:
            </p>

            <ul className="space-y-3 text-[var(--fg)]/80">
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Access Your Data:</strong> You can view and download your portraits anytime through your account.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Delete Your Account:</strong> You can delete your account and all associated data at any time. We'll miss you, but we respect your choice.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Opt Out of Communications:</strong> You can unsubscribe from our emails at any time using the link in each message.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--brand)] mt-1">•</span>
                <span><strong>Manage Your Portraits:</strong> You can delete individual portraits from your account if you no longer want them stored.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Cookies and Local Storage</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              We use cookies and local storage to remember your preferences, like your favorite loading animations and aspect ratios. This helps us provide a personalized experience that remembers how you like to create portraits of your pets.
            </p>

            <p className="mb-4 text-[var(--fg)]/80">
              You can control these settings through your browser, but disabling them may affect your experience on our site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Children's Privacy</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              Our service is designed for pet lovers of all ages, but we don't knowingly collect personal information from children under 13. If you're a parent and believe your child has provided us with information, please contact us so we can address the situation with care and respect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Changes to This Policy</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. When we do, we'll notify you through your account or by email, so you're always aware of how we're protecting your information and your beloved pet photos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--brand)]">Contact Us</h2>
            
            <p className="mb-4 text-[var(--fg)]/80">
              If you have any questions about this privacy policy or how we handle your information, please don't hesitate to reach out. We're here to help and want to make sure you feel comfortable and confident when creating portraits of your precious pets.
            </p>

            <div className="bg-[var(--muted)] p-6 rounded-xl border border-[var(--line)]">
              <p className="text-[var(--fg)]/80">
                <strong>Email:</strong> privacy@petportraitstudio.com<br/>
                <strong>Response Time:</strong> We typically respond within 24-48 hours<br/>
                <strong>Subject Line:</strong> Please include "Privacy Question" in your subject line for faster processing
              </p>
            </div>
          </section>

          <section className="pt-8 border-t border-[var(--line)]">
            <p className="text-sm text-[var(--fg)]/60">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-[var(--fg)]/60 mt-2">
              This privacy policy is written with love for pets and their families. We believe that creating beautiful portraits of your beloved companions should be a joyful, secure experience that honors the special bond you share.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
