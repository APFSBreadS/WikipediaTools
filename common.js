(async function() {
    'use strict';

    if (typeof mw === 'undefined' || mw.config.get('wgAction') !== 'view') return;

    const avvisiVoci = [
        {
            name: "cancella: C1",
            type: 0,
            subject: "+cancella subito (per [[WP:C1]])",
            text: "{{cancella subito|per [[WP:C1]]}}"
        },
        {
            name: "cancella: C1+C4",
            type: 0,
            subject: "+cancella subito (per [[WP:C1]] e [[WP:C4]])",
            text: "{{cancella subito|per [[WP:C1]] e [[WP:C4]]}}"
        },
        {
            name: "+F",
            type: 1,
            input: [
                {
                    name: "argomento",
                    description: "argomento della pagina",
                    type: "string",
                    required: true,
                }
            ],
            subject: "+F",
            text: "{{F|$argomento$|{{subst:#timel:F Y}}}}"
        }
    ];

    $(document).ready(function() {
        const editTab = $('#ca-edit');
        if (!editTab.length) return;

        let menuItemsHtml = '';
        avvisiVoci.forEach((item, index) => {
            menuItemsHtml += `<a href="#" class="speedy-item" data-index="${index}" style="display: block; color: #0645ad;">${item.name}</a>`;
        });

        const $menuContainer = $(
            `<li id="ca-speedy-delete" class="mw-list-item" style="position: relative; display: inline-block;">
                <a href="#" id="speedy-toggle"">
                    <span>Quick insert</span>
                </a>
                <div id="speedy-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #a7d7f9; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 999; padding: 5px; min-width: 160px; white-space: nowrap;">
                    ${menuItemsHtml}
                </div>
            </li>`
        );

        editTab.after($menuContainer);

        $('#speedy-toggle').on('click', function(e) {
            e.preventDefault();
            $('#speedy-dropdown').toggle();
        });

        $(document).on('click', function(e) {
            if (!$(e.target).closest('#ca-speedy-delete').length) {
                $('#speedy-dropdown').hide();
            }
        });

        $('.speedy-item').on('click', function(e) {
            e.preventDefault();
            $('#speedy-dropdown').hide();

            const index = $(this).attr('data-index');
            const selectedData = avvisiVoci[index];

            processTemplate(selectedData);
        });
    });

    function processTemplate(data) {
        let finalParameters = {};

        if (data.type === 1 && data.input && data.input.length > 0) {
            for (let field of data.input) {
                let userInput = prompt(`Inserisci il valore per "${field.name}" (${field.description}):`);

                if (userInput === null) return;

                if (field.required && !userInput.trim()) {
                    alert("Il campo è obbligatorio!");
                    return;
                }

                finalParameters[field.name] = userInput.trim();
            }
        }

        let processedText = data.text;
        let processedSubject = data.subject;

        for (let key in finalParameters) {
            const regex = new RegExp(`\\$${key}\\$`, 'g');
            processedText = processedText.replace(regex, finalParameters[key]);
            processedSubject = processedSubject.replace(regex, finalParameters[key]);
        }

        if (!confirm(`Inserire il contenuto di "${data.name}" in cima alla pagina?`)) return;

        applyTemplate({
            name: data.name,
            text: processedText,
            subject: processedSubject
        });
    }

    function applyTemplate(data) {
        const api = new mw.Api();
        api.postWithEditToken({
            action: 'edit',
            title: mw.config.get('wgPageName'),
            prependtext: data.text + "\n",
            summary: data.subject
        }).done(function(res) {
            if (res && res.edit && res.edit.result === 'Success') {
                location.reload();
            } else {
                alert('Errore durante la modifica.');
            }
        }).fail(function5 => {
            alert('Errore API: ' + (function5.error ? function5.error.info : function5));
        });
    }
})();