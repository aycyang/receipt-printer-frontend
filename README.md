# ESC/POS Receipt Printer UI

*This project is a work in progress!*

There is an EPSON TM-T88V thermal receipt printer in the Recurse Center hub. This project is an attempt to develop a browser-based UI for it that doesn't obscure the functionality that ESC/POS supports, while providing tools to make it easy and accessible to craft beautifully laid-out pixel-perfect receipts.

### Try it out

If you're in the hub and connected to the Recurse Center LAN, you can access the UI at <http://receipt.local/> (this is an mDNS hostname). Macs seem to have the best chance at resolving this hostname. Sometimes this fails to resolve at first, but may start working about a minute after the initial attempt. Sometimes, even though it doesn't work in the browser, `ping receipt.local` does successfully find out the IP address, and subsequent attempts in the browser may succeed after that.

### Goals

- Image upload, editing, and conversion tools
- Typesetting tools
- Support proportionally-spaced bitmap fonts
- Allow user to directly edit ESC/POS bytes (but not as the primary mode of editing)
