const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    // Configure SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid configured successfully');
    } else {
      console.warn('⚠️  SendGrid API key not found in environment variables');
    }

    // Default sender
    this.defaultSender = process.env.EMAIL_FROM || 'GreenScore Marketplace <marketplace@greenscore.world>';
    
    // Load and compile email templates
    this.templates = {};
    this.loadTemplates();
    
    // Email throttling to prevent spam
    this.emailThrottle = new Map(); // Track emails sent per user
    this.THROTTLE_LIMIT = 10; // Max emails per hour per user
    this.THROTTLE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  loadTemplates() {
    const templateDir = path.join(__dirname, 'email-templates');
    
    // Create template directory if it doesn't exist
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
      this.createDefaultTemplates(templateDir);
    }

    // Load all templates
    const templateFiles = fs.readdirSync(templateDir).filter(file => file.endsWith('.hbs'));
    
    for (const file of templateFiles) {
      const templateName = file.replace('.hbs', '');
      const templateContent = fs.readFileSync(path.join(templateDir, file), 'utf-8');
      this.templates[templateName] = handlebars.compile(templateContent);
    }
    
    // Register common helpers
    handlebars.registerHelper('formatCurrency', (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(amount);
    });
    
    handlebars.registerHelper('formatDate', (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });
  }

  createDefaultTemplates(templateDir) {
    // Base layout template
    const baseLayout = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: #5a67d8;
    }
    .footer {
      background: #f7f7f7;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .info-box {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .order-details {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .order-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .order-details td {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .order-details td:last-child {
      text-align: right;
      font-weight: bold;
    }
    .alert {
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .alert-success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    .alert-warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
    }
    .alert-danger {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    {{> header}}
    <div class="content">
      {{> body}}
    </div>
    <div class="footer">
      <p>© 2025 GreenScore Marketplace. All rights reserved.</p>
      <p>This is an automated email, please do not reply directly to this message.</p>
      <p>
        <a href="{{unsubscribeUrl}}" style="color: #667eea;">Manage Email Preferences</a> |
        <a href="{{helpUrl}}" style="color: #667eea;">Need Help?</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    // Welcome email template
    const welcomeTemplate = `<div class="header">
  <h1>Welcome to GreenScore Marketplace!</h1>
</div>
{{#> body}}
  <h2>Hello {{userName}}! 👋</h2>
  <p>Thank you for joining GreenScore Marketplace - your trusted platform for sustainable construction materials.</p>
  
  <div class="info-box">
    <strong>Your account details:</strong><br>
    Email: {{userEmail}}<br>
    Account Type: {{userType}}<br>
    {{#if companyName}}Company: {{companyName}}{{/if}}
  </div>
  
  <h3>What's Next?</h3>
  <ul>
    {{#if isSeller}}
    <li>Upload your inventory to start selling</li>
    <li>Set competitive prices for your materials</li>
    <li>Manage your projects and track sales</li>
    {{else}}
    <li>Browse available materials</li>
    <li>Request quotes from sellers</li>
    <li>Track your orders and deliveries</li>
    {{/if}}
  </ul>
  
  <center>
    <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
  </center>
  
  <p>If you have any questions, feel free to reach out to our support team.</p>
  <p>Best regards,<br>The GreenScore Team</p>
{{/body}}`;

    // Order request notification for seller
    const orderRequestTemplate = `<div class="header">
  <h1>New Order Request Received! 🛒</h1>
</div>
{{#> body}}
  <h2>Hello {{sellerName}},</h2>
  <p>You have received a new order request for your materials.</p>
  
  <div class="order-details">
    <h3>Order Details:</h3>
    <table>
      <tr>
        <td>Material:</td>
        <td>{{materialName}}</td>
      </tr>
      <tr>
        <td>Listing ID:</td>
        <td>{{listingId}}</td>
      </tr>
      <tr>
        <td>Quantity:</td>
        <td>{{quantity}} {{unit}}</td>
      </tr>
      <tr>
        <td>Unit Price:</td>
        <td>{{formatCurrency unitPrice}}</td>
      </tr>
      <tr>
        <td><strong>Total Amount:</strong></td>
        <td><strong>{{formatCurrency totalAmount}}</strong></td>
      </tr>
    </table>
  </div>
  
  <div class="info-box">
    <h3>Buyer Information:</h3>
    <strong>{{buyerName}}</strong><br>
    {{#if buyerCompany}}Company: {{buyerCompany}}<br>{{/if}}
    Email: {{buyerEmail}}<br>
    Phone: {{buyerPhone}}<br>
    {{#if deliveryAddress}}<br><strong>Delivery Address:</strong><br>{{deliveryAddress}}{{/if}}
    {{#if deliveryNotes}}<br><strong>Notes:</strong> {{deliveryNotes}}{{/if}}
  </div>
  
  <center>
    <a href="{{orderRequestUrl}}" class="button">Review Order Request</a>
  </center>
  
  <p><small>Please review and respond to this order request promptly to maintain a good seller rating.</small></p>
{{/body}}`;

    // Order approval notification for buyer
    const orderApprovalTemplate = `<div class="header">
  <h1>Order Approved! ✅</h1>
</div>
{{#> body}}
  <h2>Hello {{buyerName}},</h2>
  <p>Great news! Your order has been approved by the seller.</p>
  
  <div class="alert alert-success">
    <strong>Order ID:</strong> {{orderId}}<br>
    <strong>Status:</strong> Approved & Processing
  </div>
  
  <div class="order-details">
    <h3>Order Summary:</h3>
    <table>
      <tr>
        <td>Material:</td>
        <td>{{materialName}}</td>
      </tr>
      <tr>
        <td>Quantity:</td>
        <td>{{quantity}} {{unit}}</td>
      </tr>
      <tr>
        <td>Unit Price:</td>
        <td>{{formatCurrency unitPrice}}</td>
      </tr>
      <tr>
        <td>Subtotal:</td>
        <td>{{formatCurrency subtotal}}</td>
      </tr>
      <tr>
        <td>Platform Fee (5%):</td>
        <td>{{formatCurrency platformFee}}</td>
      </tr>
      <tr>
        <td><strong>Total Amount:</strong></td>
        <td><strong>{{formatCurrency totalAmount}}</strong></td>
      </tr>
    </table>
  </div>
  
  {{#if sellerNotes}}
  <div class="info-box">
    <strong>Note from Seller:</strong><br>
    {{sellerNotes}}
  </div>
  {{/if}}
  
  <h3>What's Next?</h3>
  <ul>
    <li>The seller will prepare your order for shipment</li>
    <li>You'll receive tracking information once the order ships</li>
    <li>Expected delivery within 3-5 business days</li>
  </ul>
  
  <center>
    <a href="{{orderTrackingUrl}}" class="button">Track Your Order</a>
  </center>
{{/body}}`;

    // Order decline notification for buyer
    const orderDeclineTemplate = `<div class="header">
  <h1>Order Request Update</h1>
</div>
{{#> body}}
  <h2>Hello {{buyerName}},</h2>
  <p>Unfortunately, your order request could not be fulfilled at this time.</p>
  
  <div class="alert alert-warning">
    <strong>Order Request Status:</strong> Declined<br>
    {{#if reason}}<strong>Reason:</strong> {{reason}}{{/if}}
  </div>
  
  <div class="info-box">
    <h3>Order Request Details:</h3>
    Material: {{materialName}}<br>
    Quantity Requested: {{quantity}} {{unit}}<br>
    Request Date: {{formatDate requestDate}}
  </div>
  
  {{#if sellerNotes}}
  <p><strong>Note from Seller:</strong> {{sellerNotes}}</p>
  {{/if}}
  
  <h3>What You Can Do:</h3>
  <ul>
    <li>Browse similar materials from other sellers</li>
    <li>Adjust your quantity and try again</li>
    <li>Contact the seller directly for clarification</li>
  </ul>
  
  <center>
    <a href="{{browseUrl}}" class="button">Browse Similar Materials</a>
  </center>
{{/body}}`;

    // Order status update template
    const orderStatusTemplate = `<div class="header">
  <h1>Order Status Update 📦</h1>
</div>
{{#> body}}
  <h2>Hello {{recipientName}},</h2>
  <p>There's an update on your order #{{orderId}}.</p>
  
  <div class="alert {{#if isShipped}}alert-success{{else if isDelivered}}alert-success{{else}}alert-warning{{/if}}">
    <strong>New Status:</strong> {{status}}<br>
    {{#if trackingNumber}}<strong>Tracking Number:</strong> {{trackingNumber}}{{/if}}
  </div>
  
  <div class="order-details">
    <h3>Order Information:</h3>
    <table>
      <tr>
        <td>Material:</td>
        <td>{{materialName}}</td>
      </tr>
      <tr>
        <td>Quantity:</td>
        <td>{{quantity}} {{unit}}</td>
      </tr>
      <tr>
        <td>Total Amount:</td>
        <td>{{formatCurrency totalAmount}}</td>
      </tr>
      {{#if estimatedDelivery}}
      <tr>
        <td>Estimated Delivery:</td>
        <td>{{formatDate estimatedDelivery}}</td>
      </tr>
      {{/if}}
    </table>
  </div>
  
  {{#if notes}}
  <div class="info-box">
    <strong>Additional Notes:</strong><br>
    {{notes}}
  </div>
  {{/if}}
  
  <center>
    <a href="{{orderTrackingUrl}}" class="button">View Order Details</a>
  </center>
{{/body}}`;

    // Internal transfer notification
    const transferNotificationTemplate = `<div class="header">
  <h1>Material Transfer Completed 🔄</h1>
</div>
{{#> body}}
  <h2>Hello {{userName}},</h2>
  <p>A material transfer has been completed successfully.</p>
  
  <div class="info-box">
    <h3>Transfer Details:</h3>
    <strong>Material:</strong> {{materialName}}<br>
    <strong>Quantity:</strong> {{quantity}} {{unit}}<br>
    <strong>From Project:</strong> {{fromProject}}<br>
    <strong>To Project:</strong> {{toProject}}<br>
    <strong>Transfer Date:</strong> {{formatDate transferDate}}<br>
    {{#if notes}}<strong>Notes:</strong> {{notes}}{{/if}}
  </div>
  
  <p>The inventory has been updated accordingly.</p>
  
  <center>
    <a href="{{inventoryUrl}}" class="button">View Inventory</a>
  </center>
{{/body}}`;

    // Batch order notification
    const batchOrderTemplate = `<div class="header">
  <h1>Multiple Order Requests Received! 🛍️</h1>
</div>
{{#> body}}
  <h2>Hello {{sellerName}},</h2>
  <p>You have received multiple order requests from <strong>{{buyerCompany}}</strong>.</p>
  
  <div class="alert alert-success">
    <strong>Total Items:</strong> {{itemCount}}<br>
    <strong>Total Value:</strong> {{formatCurrency totalAmount}}
  </div>
  
  <div class="order-details">
    <h3>Items Requested:</h3>
    <table>
      {{#each items}}
      <tr>
        <td>{{this.material}} ({{this.listingId}})</td>
        <td>{{this.quantity}} {{this.unit}} @ {{formatCurrency this.unitPrice}}</td>
      </tr>
      {{/each}}
    </table>
  </div>
  
  <center>
    <a href="{{orderRequestsUrl}}" class="button">Review All Requests</a>
  </center>
  
  <p><small>You can approve or decline these requests individually or in bulk.</small></p>
{{/body}}`;

    // Password reset template
    const passwordResetTemplate = `<div class="header">
  <h1>Password Reset Request 🔐</h1>
</div>
{{#> body}}
  <h2>Hello {{userName}},</h2>
  <p>We received a request to reset your password for your GreenScore Marketplace account.</p>
  
  <div class="alert alert-warning">
    <strong>Important:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
  </div>
  
  <p>To reset your password, click the button below:</p>
  
  <center>
    <a href="{{resetLink}}" class="button">Reset Password</a>
  </center>
  
  <p><small>This link will expire in 1 hour for security reasons.</small></p>
  
  <p>Alternatively, you can copy and paste this link into your browser:</p>
  <p style="word-break: break-all; color: #667eea;">{{resetLink}}</p>
{{/body}}`;

    // Save all templates
    const templates = {
      'base-layout': baseLayout,
      'welcome': welcomeTemplate,
      'order-request': orderRequestTemplate,
      'order-approval': orderApprovalTemplate,
      'order-decline': orderDeclineTemplate,
      'order-status': orderStatusTemplate,
      'transfer-notification': transferNotificationTemplate,
      'batch-order': batchOrderTemplate,
      'password-reset': passwordResetTemplate
    };

    for (const [name, content] of Object.entries(templates)) {
      fs.writeFileSync(path.join(templateDir, `${name}.hbs`), content);
    }
  }

  // Check if user has exceeded email throttle limit
  checkThrottle(userId) {
    const now = Date.now();
    const userThrottle = this.emailThrottle.get(userId);
    
    if (!userThrottle) {
      this.emailThrottle.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    // Reset throttle if window has passed
    if (now - userThrottle.startTime > this.THROTTLE_WINDOW) {
      this.emailThrottle.set(userId, { count: 1, startTime: now });
      return true;
    }
    
    // Check if under limit
    if (userThrottle.count < this.THROTTLE_LIMIT) {
      userThrottle.count++;
      return true;
    }
    
    return false; // Throttle limit exceeded
  }

  // Main method to send emails
  async sendEmail(to, subject, templateName, data, options = {}) {
    try {
      // Check if SendGrid is configured
      if (!process.env.SENDGRID_API_KEY) {
        console.log('📧 SendGrid not configured. Skipping email to:', to);
        console.log('   Subject:', subject);
        console.log('   Template:', templateName);
        return { success: false, message: 'SendGrid not configured' };
      }

      // Check throttle if userId provided
      if (options.userId && !this.checkThrottle(options.userId)) {
        console.log('⚠️ Email throttle limit exceeded for user:', options.userId);
        return { success: false, message: 'Email limit exceeded. Please try again later.' };
      }

      // Get template
      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Add default data
      const emailData = {
        ...data,
        unsubscribeUrl: options.unsubscribeUrl || `${process.env.APP_URL}/unsubscribe`,
        helpUrl: options.helpUrl || `${process.env.APP_URL}/help`,
        appUrl: process.env.APP_URL || 'http://localhost:3000'
      };

      // Generate HTML content
      const html = template(emailData);

      // SendGrid message format
      const msg = {
        to: to,
        from: options.from || this.defaultSender,
        subject: subject,
        html: html,
        ...options.additionalOptions
      };

      // Send email via SendGrid
      const response = await sgMail.send(msg);
      
      console.log('✅ Email sent successfully via SendGrid:', {
        to: to,
        subject: subject,
        statusCode: response[0].statusCode
      });

      return { success: true, statusCode: response[0].statusCode };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  // Convenience methods for specific email types

  async sendWelcomeEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome to GreenScore Marketplace!',
      'welcome',
      {
        userName: user.name,
        userEmail: user.email,
        userType: user.user_type,
        companyName: user.company_name,
        isSeller: user.user_type === 'seller',
        dashboardUrl: `${process.env.APP_URL}/${user.user_type}.html`
      },
      { userId: user.id }
    );
  }

  async sendOrderRequestEmail(seller, orderRequest, material, buyer) {
    return this.sendEmail(
      seller.email,
      `New Order Request - ${material.material}`,
      'order-request',
      {
        sellerName: seller.name,
        materialName: material.material,
        listingId: material.listing_id,
        quantity: orderRequest.quantity,
        unit: material.unit || 'units',
        unitPrice: orderRequest.unit_price,
        totalAmount: orderRequest.total_amount,
        buyerName: buyer.name || orderRequest.buyer_contact_person,
        buyerCompany: buyer.company_name || orderRequest.buyer_company,
        buyerEmail: buyer.email || orderRequest.buyer_email,
        buyerPhone: orderRequest.buyer_phone,
        deliveryAddress: orderRequest.delivery_address,
        deliveryNotes: orderRequest.delivery_notes,
        orderRequestUrl: `${process.env.APP_URL}/seller.html#requests`
      },
      { userId: seller.id }
    );
  }

  async sendOrderApprovalEmail(buyer, order, material, seller) {
    const subtotal = order.total_amount;
    const platformFee = order.platform_fee || subtotal * 0.05;
    const totalAmount = subtotal + platformFee;

    return this.sendEmail(
      buyer.email,
      `Order Approved - ${material.material}`,
      'order-approval',
      {
        buyerName: buyer.name,
        orderId: order.id.substring(0, 8),
        materialName: material.material,
        quantity: order.quantity,
        unit: material.unit || 'units',
        unitPrice: order.unit_price,
        subtotal: subtotal,
        platformFee: platformFee,
        totalAmount: totalAmount,
        sellerNotes: order.seller_notes,
        orderTrackingUrl: `${process.env.APP_URL}/buyer.html#orders`
      },
      { userId: buyer.id }
    );
  }

  async sendOrderDeclineEmail(buyer, orderRequest, material, seller, reason) {
    return this.sendEmail(
      buyer.email,
      `Order Request Update - ${material.material}`,
      'order-decline',
      {
        buyerName: buyer.name,
        materialName: material.material,
        quantity: orderRequest.quantity,
        unit: material.unit || 'units',
        requestDate: orderRequest.created_at,
        reason: reason || 'Stock unavailable',
        sellerNotes: orderRequest.seller_notes,
        browseUrl: `${process.env.APP_URL}/buyer.html`
      },
      { userId: buyer.id }
    );
  }

  async sendOrderStatusEmail(recipient, order, material, status, additionalData = {}) {
    const statusMessages = {
      'processing': 'Your order is being processed',
      'shipped': 'Your order has been shipped!',
      'delivered': 'Your order has been delivered!',
      'cancelled': 'Your order has been cancelled'
    };

    return this.sendEmail(
      recipient.email,
      `Order ${status.charAt(0).toUpperCase() + status.slice(1)} - ${material.material}`,
      'order-status',
      {
        recipientName: recipient.name,
        orderId: order.id.substring(0, 8),
        status: statusMessages[status] || status,
        isShipped: status === 'shipped',
        isDelivered: status === 'delivered',
        materialName: material.material,
        quantity: order.quantity,
        unit: material.unit || 'units',
        totalAmount: order.total_amount,
        trackingNumber: additionalData.trackingNumber,
        estimatedDelivery: additionalData.estimatedDelivery,
        notes: additionalData.notes,
        orderTrackingUrl: `${process.env.APP_URL}/${recipient.user_type}.html#orders`
      },
      { userId: recipient.id }
    );
  }

  async sendBatchOrderEmail(seller, buyerCompany, items, totalAmount) {
    return this.sendEmail(
      seller.email,
      `Multiple Order Requests from ${buyerCompany}`,
      'batch-order',
      {
        sellerName: seller.name,
        buyerCompany: buyerCompany,
        itemCount: items.length,
        totalAmount: totalAmount,
        items: items.map(item => ({
          material: item.material,
          listingId: item.listingId,
          quantity: item.quantity,
          unit: item.unit || 'units',
          unitPrice: item.unitPrice
        })),
        orderRequestsUrl: `${process.env.APP_URL}/seller.html#requests`
      },
      { userId: seller.id }
    );
  }

  async sendTransferNotificationEmail(user, transfer, material, fromProject, toProject) {
    return this.sendEmail(
      user.email,
      `Material Transfer Completed - ${material.material}`,
      'transfer-notification',
      {
        userName: user.name,
        materialName: material.material,
        quantity: transfer.quantity,
        unit: material.unit || 'units',
        fromProject: fromProject,
        toProject: toProject,
        transferDate: transfer.created_at,
        notes: transfer.notes,
        inventoryUrl: `${process.env.APP_URL}/seller.html#inventory`
      },
      { userId: user.id }
    );
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetLink = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
    
    return this.sendEmail(
      user.email,
      'Password Reset Request - GreenScore Marketplace',
      'password-reset',
      {
        userName: user.name,
        resetLink: resetLink
      },
      { userId: user.id }
    );
  }
}

module.exports = EmailService;

