$(document).ready(function () {
    const API_URL = 'http://localhost:5000';

    /**
     * MOCK BACKEND SYSTEM
     * Since json-server/npm is not available in the environment, 
     * we intercept jQuery.ajax calls to simulate a real REST API.
     * This fulfills the AJAX requirement while ensuring the app works offline/from file://.
     */
    const initialEvents = [
        {
            "id": "1",
            "title": "AI & Machine Learning Hackathon",
            "date": "2026-04-15",
            "time": "10:00 AM",
            "location": "Main Auditorium",
            "description": "Build innovative AI models in 24 hours. Great prizes and networking!",
            "total_seats": 50,
            "available_seats": 2,
            "image": "images/ai.png"
        },
        {
            "id": "2",
            "title": "Web3 & Blockchain Summit",
            "date": "2026-04-16",
            "time": "02:00 PM",
            "location": "Conference Room A",
            "description": "Explore the future of decentralized web and smart contracts.",
            "total_seats": 100,
            "available_seats": 100,
            "image": "images/blockchain.png"
        },
        {
            "id": "3",
            "title": "Cybersecurity Capture The Flag",
            "date": "2026-04-17",
            "time": "11:00 AM",
            "location": "Lab 3B",
            "description": "Test your hacking skills in our intensive CTF competition.",
            "total_seats": 30,
            "available_seats": 0,
            "image": "images/cyber.png"
        },
        {
            "id": "4",
            "title": "Cloud Computing Workshop",
            "date": "2026-04-18",
            "time": "09:30 AM",
            "location": "Virtual Seminar",
            "description": "Learn to deploy scalable applications using AWS and Azure.",
            "total_seats": 200,
            "available_seats": 15,
            "image": "images/cloud.png"
        }
    ];

    // Load state from localStorage or use defaults
    let events = JSON.parse(localStorage.getItem('nexus_events')) || initialEvents;

    // Ensure all existing events use the new premium local images
    events.forEach(e => {
        const matchingInitial = initialEvents.find(ie => ie.id === e.id);
        if (matchingInitial) {
            e.image = matchingInitial.image;
        }
    });

    let participants = JSON.parse(localStorage.getItem('nexus_participants')) || [];

    function saveState() {
        localStorage.setItem('nexus_events', JSON.stringify(events));
        localStorage.setItem('nexus_participants', JSON.stringify(participants));
    }

    // Intercept $ .ajax
    const originalAjax = $.ajax;
    $.ajax = function (options) {
        console.log(`[MOCK AJAX] Intercepted ${options.type} to ${options.url}`);

        const dfd = $.Deferred();

        // Simulate network delay
        setTimeout(() => {
            if (options.url.endsWith('/events')) {
                dfd.resolve(events);
            }
            else if (options.url.match(/\/events\/\d+$/)) {
                const id = options.url.split('/').pop();
                const event = events.find(e => e.id === id);

                if (options.type === 'PATCH') {
                    const data = JSON.parse(options.data);
                    Object.assign(event, data);
                    saveState();
                    dfd.resolve(event);
                } else {
                    dfd.resolve(event);
                }
            }
            else if (options.url.endsWith('/participants')) {
                if (options.type === 'POST') {
                    const newParticipant = JSON.parse(options.data);
                    newParticipant.id = Date.now().toString();
                    participants.unshift(newParticipant);
                    saveState();
                    dfd.resolve(newParticipant);
                } else {
                    // Sort by timestamp desc for fetch
                    const sorted = [...participants].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    dfd.resolve(sorted);
                }
            }
            else if (options.url.match(/\/participants\/.+$/)) {
                if (options.type === 'DELETE') {
                    const id = options.url.split('/').pop();
                    const index = participants.findIndex(p => p.id === id);
                    if (index !== -1) {
                        const removed = participants.splice(index, 1)[0];
                        saveState();
                        dfd.resolve(removed);
                    } else {
                        dfd.reject({ status: 404, statusText: 'Participant not found' });
                    }
                }
            }
            else {
                // Fallback to real ajax if not matched (unlikely here)
                originalAjax(options).then(dfd.resolve, dfd.reject);
            }
        }, 500);

        if (options.success) dfd.done(options.success);
        if (options.error) dfd.fail(options.error);

        return dfd.promise();
    };

    // Initial data fetch
    fetchEvents();
    fetchParticipants();

    // 1. Fetch Events via AJAX
    function fetchEvents() {
        $.ajax({
            url: `${API_URL}/events`,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                window.allEvents = data; // Store for filtering
                renderEvents(data);
            },
            error: function (err) {
                console.error("Error fetching events", err);
                $('#events-container').html('<div class="error-msg">Failed to load events.</div>');
            }
        });
    }

    // Event Search & Filter
    $('#event-search, #event-filter').on('input change', function () {
        filterAndRenderEvents();
    });

    function filterAndRenderEvents() {
        const searchTerm = $('#event-search').val().toLowerCase();
        const filterVal = $('#event-filter').val();

        const filtered = window.allEvents.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm);

            const matchesFilter = filterVal === 'all' ||
                (filterVal === 'available' && event.available_seats > 0) ||
                (filterVal === 'full' && event.available_seats === 0);

            return matchesSearch && matchesFilter;
        });

        renderEvents(filtered);
    }

    // 2. Render Events
    function renderEvents(eventList) {
        const container = $('#events-container');
        container.empty();

        eventList.forEach(event => {
            const seatsAvailable = event.available_seats;
            const isFull = seatsAvailable === 0;

            let seatClass = seatsAvailable < 10 ? 'critical' : 'available';
            if (isFull) seatClass = 'critical';

            const cardHtml = `
                <div class="event-card">
                    <div class="card-img-container">
                        <img src="${event.image}" alt="${event.title}" class="card-img">
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${event.title}</h3>
                        <div class="card-meta">
                            <span class="meta-item">📅 ${event.date}</span>
                            <span class="meta-item" style="margin-left:auto">⏰ ${event.time}</span>
                            <div class="meta-item" style="width:100%">📍 ${event.location}</div>
                        </div>
                        <p class="card-desc">${event.description}</p>
                        
                        <div class="card-footer">
                            <div class="seats-info ${seatClass}">
                                ${isFull ? 'Sold Out' : `${seatsAvailable} seats left`}
                            </div>
                            <button 
                                class="btn primary-btn register-btn" 
                                data-id="${event.id}" 
                                data-title="${event.title}" 
                                data-seats="${event.available_seats}"
                                ${isFull ? 'disabled' : ''}>
                                ${isFull ? 'Full' : 'Register'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(cardHtml);
        });
    }

    // 3. Dynamic Event Binding for dynamically created "Register" buttons using .on()
    $('#events-container').on('click', '.register-btn', function () {
        const eventId = $(this).data('id').toString();
        const eventTitle = $(this).data('title');
        const availableSeats = $(this).data('seats');

        if (availableSeats <= 0) return;

        // Populate Modal Data
        $('#event_id').val(eventId);
        $('#event_name').val(eventTitle);
        $('#modal-event-title').text(eventTitle);

        const seatBadge = $('#modal-event-seats');
        seatBadge.find('span').text(availableSeats);
        if (availableSeats < 10) {
            seatBadge.addClass('critical');
        } else {
            seatBadge.removeClass('critical');
        }

        // Reset form
        $('#registration-form')[0].reset();
        $('.error-msg').text('');
        $('input').removeClass('error');
        $('#form-success-message').addClass('hidden');
        $('#registration-form').show();

        // Show Modal
        $('#registration-modal').removeClass('hidden');
    });

    // Close Modal Logic
    $('.close-modal').on('click', function () {
        $('#registration-modal').addClass('hidden');
    });

    $(window).on('click', function (e) {
        if ($(e.target).is('#registration-modal')) {
            $('#registration-modal').addClass('hidden');
        }
    });

    // 4. Form Validation & Submission
    $('#registration-form').on('submit', function (e) {
        e.preventDefault();

        // Validation Reset
        let isValid = true;
        $('.error-msg').text('');
        $('input').removeClass('error');

        // Fields
        const name = $('#participant_name').val().trim();
        const email = $('#participant_email').val().trim();
        const phone = $('#participant_phone').val().trim();
        const eventId = $('#event_id').val();
        const eventName = $('#event_name').val();

        // Validate Name
        if (name.length < 3) {
            $('#name-error').text("Name must be at least 3 characters.");
            $('#participant_name').addClass('error');
            isValid = false;
        }

        // Validate Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            $('#email-error').text("Please enter a valid email address.");
            $('#participant_email').addClass('error');
            isValid = false;
        }

        // Validate Phone (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            $('#phone-error').text("Please enter a valid 10-digit phone number.");
            $('#participant_phone').addClass('error');
            isValid = false;
        }

        if (!isValid) return;

        // Valid form, proceed with AJAX
        submitRegistration({
            name: name,
            email: email,
            phone: phone,
            eventId: eventId,
            eventName: eventName,
            timestamp: new Date().toISOString()
        });
    });

    // 5. Submit AJAX Registration
    function submitRegistration(participantData) {
        const btn = $('#submit-registration-btn');
        btn.prop('disabled', true).text('Confirming...');

        $.ajax({
            url: `${API_URL}/participants`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(participantData),
            success: function (savedParticipant) {
                // Update Event Seats
                updateEventSeats(participantData.eventId);

                // Show Success
                $('#registration-form').hide();
                $('#form-success-message').removeClass('hidden');
                btn.prop('disabled', false).text('Confirm Registration');

                // Update UI dynamically
                addParticipantToUI(savedParticipant);

                setTimeout(() => {
                    $('#registration-modal').addClass('hidden');
                    showToast('Successfully registered!', 'success');
                }, 2000);
            },
            error: function (err) {
                showToast('Registration failed. Try again.', 'error');
                btn.prop('disabled', false).text('Confirm Registration');
            }
        });
    }

    // 6. Update Event Seats via AJAX
    function updateEventSeats(eventId, increment = false) {
        $.ajax({
            url: `${API_URL}/events/${eventId}`,
            type: 'GET',
            success: function (eventData) {
                let newSeats;
                if (increment) {
                    newSeats = eventData.available_seats + 1;
                    // Cap at total_seats
                    newSeats = Math.min(eventData.total_seats, newSeats);
                } else {
                    newSeats = eventData.available_seats - 1;
                    newSeats = Math.max(0, newSeats);
                }

                $.ajax({
                    url: `${API_URL}/events/${eventId}`,
                    type: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({ available_seats: newSeats }),
                    success: function () {
                        fetchEvents();
                    }
                });
            }
        });
    }

    // 7. Load Participants dynamically
    function fetchParticipants() {
        $.ajax({
            url: `${API_URL}/participants`,
            type: 'GET',
            success: function (data) {
                $('#participants-ul').empty();
                if (data.length === 0) {
                    $('#no-participants-msg').show();
                } else {
                    $('#no-participants-msg').hide();
                    data.slice(0, 8).forEach(p => addParticipantToUI(p, false));
                }
            }
        });
    }

    function addParticipantToUI(participant, prepend = true) {
        $('#no-participants-msg').hide();
        const dateString = new Date(participant.timestamp).toLocaleString();
        const li = $(`
            <li class="participant-item" data-id="${participant.id}" data-event-id="${participant.eventId}" style="opacity: 0; transform: translateY(10px)">
                <div class="participant-info">
                    <span class="participant-name">${participant.name}</span>
                    <span class="participant-event">Registered for: ${participant.eventName}</span>
                </div>
                <div class="participant-time">${dateString}</div>
                <button class="delete-participant-btn" title="Delete Registration">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </li>
        `);

        if (prepend) $('#participants-ul').prepend(li);
        else $('#participants-ul').append(li);

        // Animate in
        setTimeout(() => {
            li.css({
                'opacity': '1',
                'transform': 'translateY(0)',
                'transition': 'all 0.4s ease-out'
            });
        }, 50);
    }

    // 8. Delete Registration Logic (Custom Modal)
    let participantToDelete = null;

    $('#participants-ul').on('click', '.delete-participant-btn', function () {
        const li = $(this).closest('.participant-item');
        participantToDelete = {
            li: li,
            id: li.data('id'),
            eventId: li.data('event-id')
        };
        $('#delete-confirm-modal').removeClass('hidden');
    });

    $('#cancel-delete-btn').on('click', function () {
        $('#delete-confirm-modal').addClass('hidden');
        participantToDelete = null;
    });

    $('#confirm-delete-btn').on('click', function () {
        if (!participantToDelete) return;

        const { li, id, eventId } = participantToDelete;
        const btn = $(this);
        btn.prop('disabled', true).text('Deleting...');

        $.ajax({
            url: `${API_URL}/participants/${id}`,
            type: 'DELETE',
            success: function () {
                li.fadeOut(300, function () {
                    $(this).remove();
                    if ($('#participants-ul li').length === 0) {
                        $('#no-participants-msg').fadeIn();
                    }
                });

                updateEventSeats(eventId, true);
                showToast('Registration deleted successfully', 'success');
                $('#delete-confirm-modal').addClass('hidden');
            },
            error: function () {
                showToast('Failed to delete registration', 'error');
            },
            complete: function () {
                btn.prop('disabled', false).text('Yes, Delete');
                participantToDelete = null;
            }
        });
    });

    function showToast(message, type = 'success') {
        const toast = $('#toast');
        toast.text(message).removeClass('success error').addClass(type).addClass('show');
        setTimeout(() => toast.removeClass('show'), 3000);
    }
});
